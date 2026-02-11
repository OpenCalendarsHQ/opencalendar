"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarView, type CalendarViewRef } from "@/components/calendar/calendar-view";
import { useCalendar } from "@/lib/calendar-context";
import { useTodos } from "@/hooks/use-todos";
import { useRecurringEvents } from "@/hooks/use-recurring-events";
import { useSession } from "@/lib/auth/client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
} from "date-fns";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const eventCache = useRef<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 
    currentDate, 
    viewType, 
    weekStartsOn, 
    setCurrentDate, 
    setViewType, 
    registerCreateEvent, 
    registerOpenEvent, 
    registerRefreshEvents, 
    visibleCalendarIds 
  } = useCalendar();
  const { todos, toggleTodo } = useTodos();
  const hasSynced = useRef(false);
  const hasInitialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const calendarRef = useRef<CalendarViewRef>(null);
  const syncingStartTime = useRef<number>(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/sign-in");
    }
  }, [session, isPending, router]);

  // Detect if we just added an account and should start rapid polling
  useEffect(() => {
    if (searchParams.get("syncing") === "true") {
      setIsSyncing(true);
      syncingStartTime.current = Date.now();
      // Clear the URL parameter
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  // Compute visible date range based on current view
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewType === "day") {
      start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
    } else if (viewType === "week") {
      start = startOfWeek(currentDate, { weekStartsOn });
      end = endOfWeek(currentDate, { weekStartsOn });
    } else {
      // Month view: include overflow weeks
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart, { weekStartsOn });
      end = endOfWeek(monthEnd, { weekStartsOn });
    }

    // Add 1 day buffer on each side for timezone safety
    return {
      start: addDays(start, -1).toISOString(),
      end: addDays(end, 1).toISOString(),
      startDate: addDays(start, -1),
      endDate: addDays(end, 1),
    };
  }, [currentDate, viewType, weekStartsOn]);

  // Filter events based on visible calendars
  const visibleRawEvents = useMemo(() => {
    return rawEvents.filter((e) => visibleCalendarIds.has(e.calendarId));
  }, [rawEvents, visibleCalendarIds]);

  // Expand recurring events client-side for better performance
  const events = useRecurringEvents(visibleRawEvents, dateRange.startDate, dateRange.endDate);

  const fetchEvents = useCallback(
    async (signal?: AbortSignal) => {
      const cacheKey = `${dateRange.start}-${dateRange.end}`;
      
      // Use cache for instant feedback if available
      if (eventCache.current.has(cacheKey)) {
        setRawEvents(eventCache.current.get(cacheKey)!);
        setLoading(false);
      }

      try {
        setError(null); // Clear previous errors
        const url = `/api/events?start=${encodeURIComponent(dateRange.start)}&end=${encodeURIComponent(dateRange.end)}`;
        const res = await fetch(url, { signal });

        // Handle authentication errors (expired session)
        if (res.status === 401) {
          setError(t("sessionExpired"));
          router.push("/auth/sign-in");
          return -1; // Return -1 to indicate auth error (stops polling)
        }

        // Handle rate limiting
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
          console.warn(`Rate limited, waiting ${waitSeconds}s`);
          setError(t("tooManyRequests", { seconds: waitSeconds }));
          setLoading(false);
          // Stop syncing if we hit rate limits
          setIsSyncing(false);
          return -1; // Return -1 to stop polling
        }

        // Handle other errors
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Onbekende fout" }));
          setError(data.error || `Fout bij ophalen van events (${res.status})`);
          setLoading(false);
          return 0;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          // Store raw events (including RRULE metadata)
          setRawEvents(data);
          eventCache.current.set(cacheKey, data);
          setLoading(false);
          return data.length;
        } else {
          setError(t("invalidResponse"));
          setLoading(false);
          return 0;
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof DOMException && err.name === "AbortError") {
          return 0;
        }

        console.error("Fetch events error:", err);
        setError(t("networkError"));
        setLoading(false);
        return 0;
      }
    },
    [dateRange, router, t]
  );

  // Check if user has any calendars before syncing
  const hasCalendars = useCallback(async () => {
    try {
      const res = await fetch("/api/calendars");
      if (res.status === 401) {
        router.push("/auth/sign-in");
        return false;
      }
      if (!res.ok) return false;
      const groups = await res.json();
      return Array.isArray(groups) && groups.length > 0;
    } catch {
      return false;
    }
  }, [router]);

  // Auto-sync on first load if no events (background, non-blocking)
  const triggerSync = useCallback(async () => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    
    // First check if there are any calendars
    const calendarsExist = await hasCalendars();
    if (!calendarsExist) {
      console.log("No calendars found, skipping sync");
      return;
    }
    
    try {
      const res = await fetch("/api/calendars");

      if (res.status === 401) {
        router.push("/auth/sign-in");
        return;
      }

      if (!res.ok) return;

      const groups = await res.json();
      if (!Array.isArray(groups)) return;

      // Sync all accounts in parallel (max 3 at a time to avoid rate limits)
      const nonLocalGroups = groups.filter(group => group.provider !== "local");
      if (nonLocalGroups.length === 0) return;
      
      // Sync in batches of 3 to avoid overwhelming the server
      for (let i = 0; i < nonLocalGroups.length; i += 3) {
        const batch = nonLocalGroups.slice(i, i + 3);
        const syncPromises = batch.map(group => {
          const endpoint =
            group.provider === "google" ? "/api/sync/google" : "/api/sync/icloud";
          return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync", accountId: group.id }),
          }).catch((err) => {
            console.warn(`Sync failed for ${group.provider}:`, err);
          });
        });
        await Promise.all(syncPromises);
        // Small delay between batches
        if (i + 3 < nonLocalGroups.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      await fetchEvents();
    } catch (err) {
      console.error("Trigger sync error:", err);
    }
  }, [fetchEvents, router, hasCalendars]);

  // Fetch events when date range changes or session becomes available
  useEffect(() => {
    if (isPending || !session) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const init = async () => {
      const count = await fetchEvents(controller.signal);
      // Only trigger sync if we got 0 events (not -1 which means error)
      if (count === 0 && !hasSynced.current) {
        await triggerSync();
      }
      hasInitialized.current = true;
    };
    init();

    return () => controller.abort();
  }, [fetchEvents, triggerSync, session, isPending]);

  // Rapid polling during initial sync - max 15 attempts with exponential backoff
  useEffect(() => {
    if (!isSyncing) return;

    let pollCount = 0;
    const maxPolls = 15;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const pollEvents = async () => {
      if (isCancelled || pollCount >= maxPolls) {
        setIsSyncing(false);
        return;
      }

      pollCount++;
      const eventCount = await fetchEvents();
      
      // Stop polling if we got events, hit rate limit (-1), or auth error
      if (eventCount > 0 || eventCount === -1) {
        setTimeout(() => setIsSyncing(false), 3000);
        return;
      }

      // Exponential backoff: 2s, 2s, 2s, 4s, 4s, 4s, 8s, 8s...
      const delay = Math.min(2000 * Math.pow(2, Math.floor((pollCount - 1) / 3)), 10000);
      
      if (pollCount < maxPolls) {
        timeoutId = setTimeout(pollEvents, delay);
      } else {
        setIsSyncing(false);
      }
    };

    // Start first poll immediately
    timeoutId = setTimeout(pollEvents, 1000);

    // Safety timeout after 60 seconds
    const safetyTimeout = setTimeout(() => {
      isCancelled = true;
      setIsSyncing(false);
    }, 60000);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, [isSyncing, fetchEvents]);

  // Periodic refresh
  useEffect(() => {
    if (isSyncing) return;

    let interval: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (interval) return;
      interval = setInterval(() => fetchEvents(), 300_000);
    };

    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        fetchEvents();
        startInterval();
      }
    };

    if (!document.hidden) startInterval();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchEvents, isSyncing]);

  useEffect(() => {
    if (calendarRef.current) {
      registerCreateEvent(() => calendarRef.current?.openCreateModal());
      registerOpenEvent((eventId) => calendarRef.current?.openEventModal(eventId));
    }
    registerRefreshEvents(() => fetchEvents());
  }, [registerCreateEvent, registerOpenEvent, registerRefreshEvents, fetchEvents]);

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 backdrop-blur-sm px-4 py-2 shadow-lg">
            <svg className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-destructive">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-destructive hover:text-destructive/80 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 rounded-full border border-border bg-popover/95 backdrop-blur-sm px-4 py-2 shadow-lg">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{t("syncing")}</span>
          </div>
        </div>
      )}

      <CalendarView
        ref={calendarRef}
        currentDate={currentDate}
        viewType={viewType}
        events={events}
        rawEvents={rawEvents}
        todos={todos}
        onEventsChange={() => fetchEvents()}
        onDateChange={setCurrentDate}
        onViewTypeChange={setViewType}
        onToggleTodo={toggleTodo}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
