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
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentDate, viewType, weekStartsOn, setCurrentDate, setViewType, registerCreateEvent, registerOpenEvent, registerRefreshEvents, visibleCalendarIds } = useCalendar();
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
      try {
        setError(null); // Clear previous errors
        const url = `/api/events?start=${encodeURIComponent(dateRange.start)}&end=${encodeURIComponent(dateRange.end)}`;
        const res = await fetch(url, { signal });

        // Handle authentication errors (expired session)
        if (res.status === 401) {
          setError(t("sessionExpired"));
          router.push("/auth/sign-in");
          return 0;
        }

        // Handle rate limiting
        if (res.status === 429) {
          const data = await res.json();
          setError(t("tooManyRequests", { seconds: Math.ceil((new Date(data.resetAt).getTime() - Date.now()) / 1000) }));
          setLoading(false);
          return 0;
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
          // Client-side hook will expand recurring events
          setRawEvents(data);
          setLoading(false);
          return data.length;
        } else {
          setError(t("invalidResponse"));
          setLoading(false);
          return 0;
        }
      } catch (err) {
        // Ignore abort errors (expected when switching views)
        if (err instanceof DOMException && err.name === "AbortError") {
          return 0;
        }

        // Handle network errors
        console.error("Fetch events error:", err);
        setError(t("networkError"));
        setLoading(false);
        return 0;
      }
    },
    [dateRange, router]
  );

  // Auto-sync on first load if no events (background, non-blocking)
  const triggerSync = useCallback(async () => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    try {
      const res = await fetch("/api/calendars");

      // Handle authentication errors
      if (res.status === 401) {
        router.push("/auth/sign-in");
        return;
      }

      if (!res.ok) {
        console.warn("Failed to fetch calendars for sync:", res.status);
        return;
      }

      const groups = await res.json();
      if (!Array.isArray(groups)) {
        console.warn("Invalid calendars response:", groups);
        return;
      }

      // Sync all accounts in parallel for better performance
      const syncPromises = groups
        .filter(group => group.provider !== "local")
        .map(group => {
          const endpoint =
            group.provider === "google" ? "/api/sync/google" : "/api/sync/icloud";
          return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync", accountId: group.id }),
          }).catch((err) => {
            console.warn(`Sync failed for ${group.provider} account ${group.id}:`, err);
          });
        });

      // Wait for all syncs to complete, then refresh events
      await Promise.all(syncPromises);
      await fetchEvents();
    } catch (err) {
      console.error("Trigger sync error:", err);
      // Don't show error to user - sync is best-effort background operation
    }
  }, [fetchEvents, router]);

  // Fetch events when date range changes or session becomes available
  useEffect(() => {
    // Only fetch if session is available
    if (isPending || !session) return;

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const init = async () => {
      const count = await fetchEvents(controller.signal);
      if (count === 0 && !hasSynced.current) await triggerSync();
      hasInitialized.current = true;
    };
    init();

    return () => controller.abort();
  }, [fetchEvents, triggerSync, session, isPending]);

  // Rapid polling during initial sync (every 2 seconds for 60 seconds)
  useEffect(() => {
    if (!isSyncing) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    const pollEvents = async () => {
      const eventCount = await fetchEvents();
      // If we got events, stop rapid polling after a short delay
      if (eventCount > 0) {
        setTimeout(() => {
          setIsSyncing(false);
        }, 3000); // Wait 3s to catch any remaining events
      }
    };

    // Poll every 2 seconds
    pollInterval = setInterval(pollEvents, 2000);

    // Stop rapid polling after 60 seconds max
    checkInterval = setInterval(() => {
      const elapsed = Date.now() - syncingStartTime.current;
      if (elapsed > 60000) {
        setIsSyncing(false);
      }
    }, 1000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isSyncing, fetchEvents]);

  // Periodic refresh (every 5 minutes) - only when tab is visible and not rapid polling
  useEffect(() => {
    if (isSyncing) return; // Skip normal polling during rapid sync

    let interval: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (interval) return; // Already running
      interval = setInterval(() => fetchEvents(), 300_000); // 5 minutes
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
        // When tab becomes visible, fetch immediately and restart interval
        fetchEvents();
        startInterval();
      }
    };

    // Start interval if tab is visible
    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchEvents, isSyncing]);

  // Register create event and refresh functions with context
  useEffect(() => {
    if (calendarRef.current) {
      registerCreateEvent(() => calendarRef.current?.openCreateModal());
      registerOpenEvent((eventId) => calendarRef.current?.openEventModal(eventId));
    }
    registerRefreshEvents(() => fetchEvents());
  }, [registerCreateEvent, registerOpenEvent, registerRefreshEvents, fetchEvents]);

  return (
    <>
      {/* Error notification */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 backdrop-blur-sm px-4 py-2 shadow-lg">
            <svg
              className="h-4 w-4 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-destructive">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-destructive hover:text-destructive/80 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Sync notification */}
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
