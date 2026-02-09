"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandMenu } from "@/components/layout/command-menu";
import { CalendarProvider, useCalendar } from "@/lib/calendar-context";
import { useTodos } from "@/hooks/use-todos";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSession } from "@/lib/auth/client";
import type { CalendarGroup } from "@/lib/types";
import { ErrorBoundary } from "@/components/error-boundary";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const calendar = useCalendar();
  const { data: session, isPending } = useSession();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const { todos, lists, addTodo, toggleTodo, deleteTodo } = useTodos();

  // Fetch calendars function
  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch("/api/calendars");

      // Handle auth errors
      if (res.status === 401) {
        router.push("/auth/sign-in");
        return [];
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCalendarGroups(data);
          return data;
        }
      }
    } catch (err) {
      console.error("Failed to fetch calendars:", err);
    }
    return [];
  }, [router]);

  // Fetch calendars when session becomes available
  useEffect(() => {
    if (isPending) return; // Wait for session check
    if (!session) {
      router.push("/auth/sign-in");
      return;
    }

    // Session is available, fetch calendars
    fetchCalendars();
  }, [session, isPending, fetchCalendars, router]);

  const handleToggleCalendar = useCallback((calendarId: string) => {
    let newVisibility = true;
    setCalendarGroups((prev) =>
      prev.map((group) => ({
        ...group,
        calendars: group.calendars.map((cal) => {
          if (cal.id === calendarId) {
            newVisibility = !cal.isVisible;
            return { ...cal, isVisible: newVisibility };
          }
          return cal;
        }),
      }))
    );
    // Persist to API and refresh events
    setTimeout(() => {
      fetch("/api/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: calendarId, isVisible: newVisibility }),
      })
        .then(() => {
          // Refresh calendar view to show/hide events immediately
          calendar.refreshEvents();
        })
        .catch(() => {});
    }, 0);
  }, [calendar]);

  const handleChangeCalendarColor = useCallback((calendarId: string, color: string) => {
    setCalendarGroups((prev) =>
      prev.map((group) => ({
        ...group,
        calendars: group.calendars.map((cal) =>
          cal.id === calendarId ? { ...cal, color } : cal
        ),
      }))
    );
    // Persist to API and refresh events to show new colors
    fetch("/api/calendars", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: calendarId, color }),
    })
      .then(() => {
        // Refresh calendar view to show new colors immediately
        calendar.refreshEvents();
      })
      .catch(() => {});
  }, [calendar]);

  const handleSync = useCallback(async () => {
    try {
      const res = await fetch("/api/calendars");
      if (!res.ok) return;
      const groups = await res.json();
      if (!Array.isArray(groups)) return;

      // Sync all non-local calendar accounts
      const syncPromises = groups
        .filter((group) => group.provider !== "local")
        .map(async (group) => {
          let endpoint = "/api/sync/icloud";
          if (group.provider === "google") {
            endpoint = "/api/sync/google";
          } else if (group.provider === "microsoft") {
            endpoint = "/api/sync/microsoft/callback";
          }
          try {
            await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "sync", accountId: group.id }),
            });
          } catch (error) {
            console.error(`Failed to sync ${group.provider}:`, error);
          }
        });

      await Promise.all(syncPromises);

      // Refresh both calendars list AND events after sync
      await fetchCalendars();
      calendar.refreshEvents();
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    }
  }, [fetchCalendars, calendar]);

  // Close mobile sidebar on navigation
  const prevDateRef = useRef(calendar.currentDate);
  const prevViewRef = useRef(calendar.viewType);

  // Track changes and close sidebar (no setState in effect, just refs)
  if (
    (prevDateRef.current !== calendar.currentDate ||
     prevViewRef.current !== calendar.viewType) &&
    mobileSidebarOpen
  ) {
    // Schedule state update for next render
    queueMicrotask(() => setMobileSidebarOpen(false));
  }

  prevDateRef.current = calendar.currentDate;
  prevViewRef.current = calendar.viewType;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background safe-top">
      <Header
        currentDate={calendar.currentDate}
        viewType={calendar.viewType}
        onViewTypeChange={calendar.setViewType}
        onNavigateBack={calendar.navigateBack}
        onNavigateForward={calendar.navigateForward}
        onNavigateToday={calendar.navigateToday}
        onCreateEvent={calendar.createEvent}
        onOpenSearch={calendar.toggleCommandMenu}
        onSync={handleSync}
        isMobile={isMobile}
        onToggleMobileSidebar={() => setMobileSidebarOpen((p) => !p)}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {isMobile && mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72 animate-slide-in-left safe-top">
              <Sidebar
                selectedDate={calendar.currentDate}
                onDateSelect={(date) => {
                  calendar.setCurrentDate(date);
                  setMobileSidebarOpen(false);
                }}
                calendarGroups={calendarGroups}
                onToggleCalendar={handleToggleCalendar}
                onChangeCalendarColor={handleChangeCalendarColor}
                onAddAccount={() => { router.push("/settings"); setMobileSidebarOpen(false); }}
                isCollapsed={false}
                onToggleCollapsed={() => setMobileSidebarOpen(false)}
                todos={todos}
                todoLists={lists}
                onToggleTodo={toggleTodo}
                onAddTodo={addTodo}
                onDeleteTodo={deleteTodo}
                isMobile
              />
            </div>
          </>
        )}
        {/* Desktop sidebar */}
        {!isMobile && (
          <Sidebar
            selectedDate={calendar.currentDate}
            onDateSelect={calendar.setCurrentDate}
            calendarGroups={calendarGroups}
            onToggleCalendar={handleToggleCalendar}
            onChangeCalendarColor={handleChangeCalendarColor}
            onAddAccount={() => router.push("/settings")}
            isCollapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((p) => !p)}
            todos={todos}
            todoLists={lists}
            onToggleTodo={toggleTodo}
            onAddTodo={addTodo}
            onDeleteTodo={deleteTodo}
          />
        )}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileNav
          viewType={calendar.viewType}
          onViewTypeChange={calendar.setViewType}
        />
      )}
      <CommandMenu
        onCreateEvent={calendar.createEvent}
        onNavigateToSettings={() => router.push("/settings")}
        onNavigateToday={calendar.navigateToday}
        onNavigateToTasks={() => router.push("/tasks")}
        onNavigateToFocus={() => router.push("/today")}
        onEventClick={calendar.openEvent}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <CalendarProvider>
        <DashboardInner>{children}</DashboardInner>
      </CalendarProvider>
    </ErrorBoundary>
  );
}
