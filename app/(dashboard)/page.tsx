"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import type { CalendarEvent } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentDate, viewType, weekStartsOn, setCurrentDate, setViewType, registerCreateEvent, registerOpenEvent } = useCalendar();
  const { todos, toggleTodo } = useTodos();
  const hasSynced = useRef(false);
  const hasInitialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const calendarRef = useRef<CalendarViewRef>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/sign-in");
    }
  }, [session, isPending, router]);

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

  // Expand recurring events client-side for better performance
  const events = useRecurringEvents(rawEvents, dateRange.startDate, dateRange.endDate);

  const fetchEvents = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const url = `/api/events?start=${encodeURIComponent(dateRange.start)}&end=${encodeURIComponent(dateRange.end)}`;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Store raw events (including RRULE metadata)
            // Client-side hook will expand recurring events
            setRawEvents(data);
            setLoading(false);
            return data.length;
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return 0;
      }
      setLoading(false);
      return 0;
    },
    [dateRange]
  );

  // Auto-sync on first load if no events (background, non-blocking)
  const triggerSync = useCallback(async () => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    try {
      const res = await fetch("/api/calendars");
      if (!res.ok) return;
      const groups = await res.json();
      if (!Array.isArray(groups)) return;

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
          }).catch(() => {}); // Ignore errors - sync is best-effort
        });

      // Wait for all syncs to complete, then refresh events
      await Promise.all(syncPromises);
      await fetchEvents();
    } catch {
      /* ignore */
    }
  }, [fetchEvents]);

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

  // Periodic refresh (every 5 minutes) - only when tab is visible
  useEffect(() => {
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
  }, [fetchEvents]);

  // Register create event function with context
  useEffect(() => {
    if (calendarRef.current) {
      registerCreateEvent(() => calendarRef.current?.openCreateModal());
      registerOpenEvent((eventId) => calendarRef.current?.openEventModal(eventId));
    }
  }, [registerCreateEvent, registerOpenEvent]);

  return (
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
  );
}
