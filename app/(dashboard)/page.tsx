"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { useCalendar } from "@/lib/calendar-context";
import { useTodos } from "@/hooks/use-todos";
import type { CalendarEvent } from "@/lib/types";

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { currentDate, viewType, setCurrentDate, setViewType } = useCalendar();
  const { todos, toggleTodo } = useTodos();

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(
            data.map((e: Record<string, unknown>) => ({
              id: e.id as string,
              title: (e.title as string) || "Geen titel",
              startTime: new Date(e.startTime as string),
              endTime: new Date(e.endTime as string),
              color: (e.color as string) || "#737373",
              calendarId: (e.calendarId as string) || "local",
              isAllDay: (e.isAllDay as boolean) || false,
              location: e.location as string | undefined,
              description: e.description as string | undefined,
            }))
          );
          return data.length;
        }
      }
    } catch {
      // No events yet
    }
    return 0;
  }, []);

  // Trigger sync for accounts that haven't had events synced
  const triggerInitialSync = useCallback(async () => {
    try {
      const res = await fetch("/api/calendars");
      if (!res.ok) return;
      const calendars = await res.json();
      if (!Array.isArray(calendars)) return;

      for (const group of calendars) {
        if (group.provider === "local") continue;
        const endpoint = group.provider === "google" ? "/api/sync/google" : "/api/sync/icloud";
        try {
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync", accountId: group.id }),
          });
        } catch {
          // Sync failed, continue
        }
      }

      // Re-fetch events after sync
      await fetchEvents();
    } catch {
      // Ignore
    }
  }, [fetchEvents]);

  useEffect(() => {
    const init = async () => {
      const count = await fetchEvents();
      // If no events but user has accounts, trigger a sync
      if (count === 0) {
        await triggerInitialSync();
      }
    };
    init();
  }, [fetchEvents, triggerInitialSync]);

  return (
    <CalendarView
      currentDate={currentDate}
      viewType={viewType}
      events={events}
      todos={todos}
      onEventsChange={setEvents}
      onDateChange={setCurrentDate}
      onViewTypeChange={setViewType}
      onToggleTodo={toggleTodo}
    />
  );
}
