"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { DragProvider } from "@/lib/drag-context";
import { SettingsProvider } from "@/lib/settings-context";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startOnboarding } = useOnboarding();
  const { 
    currentDate, viewType, setViewType, navigateBack, navigateForward, 
    navigateToday, createEvent, toggleCommandMenu, openEvent, refreshEvents,
    calendarGroups, setCalendarGroups, refreshCalendars, setVisibleCalendarIds
  } = useCalendar();
  const { data: session, isPending } = useSession();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { todos, lists, addTodo, toggleTodo, deleteTodo } = useTodos();

  const handleToggleCalendar = useCallback((calendarId: string) => {
    // Find current visibility
    let currentVisibility = true;
    let found = false;
    
    // Check in current state
    for (const group of calendarGroups) {
      const cal = group.calendars.find((c) => c.id === calendarId);
      if (cal) {
        currentVisibility = cal.isVisible;
        found = true;
        break;
      }
    }
    
    if (!found) return;
    
    const newVisibility = !currentVisibility;

    setCalendarGroups((prev) =>
      prev.map((group) => ({
        ...group,
        calendars: group.calendars.map((cal) => {
          if (cal.id === calendarId) {
            return { ...cal, isVisible: newVisibility };
          }
          return cal;
        }),
      }))
    );
    
    // Persist to API (background)
    fetch("/api/calendars", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: calendarId, isVisible: newVisibility }),
    }).catch(() => {});
  }, [calendarGroups, setCalendarGroups]);

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
        refreshEvents();
      })
      .catch(() => {});
  }, [setCalendarGroups, refreshEvents]);

  const handleRenameCalendar = useCallback((calendarId: string, newName: string) => {
    // Optimistic update
    setCalendarGroups((prev) =>
      prev.map((group) => ({
        ...group,
        calendars: group.calendars.map((cal) =>
          cal.id === calendarId ? { ...cal, name: newName } : cal
        ),
      }))
    );

    // Persist to API
    fetch("/api/calendars", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: calendarId, name: newName }),
    }).catch((err) => {
      console.error("Failed to rename calendar:", err);
      // Revert on error
      refreshCalendars();
    });
  }, [setCalendarGroups, refreshCalendars]);

  const handleDeleteCalendar = useCallback(async (calendarId: string) => {
    try {
      const res = await fetch(`/api/calendars?calendarId=${calendarId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove calendar from state
        setCalendarGroups((prev) =>
          prev.map((group) => ({
            ...group,
            calendars: group.calendars.filter((cal) => cal.id !== calendarId),
          }))
        );
        // Refresh events to remove deleted calendar's events
        refreshEvents();
      } else {
        const data = await res.json().catch(() => ({ error: "Onbekende fout" }));
        alert(data.error || "Verwijderen mislukt");
      }
    } catch (err) {
      console.error("Failed to delete calendar:", err);
      alert("Verwijderen mislukt");
    }
  }, [setCalendarGroups, refreshEvents]);

  const handleSync = useCallback(async () => {
    try {
      // Use calendarGroups from context instead of refetching everything
      // Sync all non-local calendar accounts
      const syncPromises = calendarGroups
        .filter((group) => group.provider !== "local")
        .map(async (group) => {
          // Map provider to endpoint
          let endpoint: string;
          switch (group.provider) {
            case "google":
              endpoint = `/api/sync/google?accountId=${group.id}`;
              break;
            case "microsoft":
              endpoint = "/api/sync/microsoft/callback";
              break;
            case "icloud":
              endpoint = "/api/sync/icloud";
              break;
            case "caldav":
              endpoint = "/api/sync/caldav";
              break;
            default:
              console.warn(`Unknown provider: ${group.provider}`);
              return;
          }

          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "sync", accountId: group.id }),
            });
            if (!res.ok) {
              throw new Error(`Sync failed for ${group.provider}: ${res.statusText}`);
            }
          } catch (error) {
            console.error(`Failed to sync ${group.provider}:`, error);
            throw error;
          }
        });

      await Promise.all(syncPromises);

      // Refresh both calendars list AND events after sync
      await refreshCalendars();
      await refreshEvents();
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    }
  }, [calendarGroups, refreshCalendars, refreshEvents]);

  // Show onboarding when ?onboarding=1 in URL (e.g. after Google login)
  useEffect(() => {
    if (searchParams.get("onboarding") === "1") {
      startOnboarding();
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [searchParams, startOnboarding]);

  // Track changes and close mobile sidebar
  const prevDateRef = useRef(currentDate);
  const prevViewRef = useRef(viewType);

  if (
    (prevDateRef.current !== currentDate ||
     prevViewRef.current !== viewType) &&
    mobileSidebarOpen
  ) {
    queueMicrotask(() => setMobileSidebarOpen(false));
  }

  prevDateRef.current = currentDate;
  prevViewRef.current = viewType;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background safe-top">
      <Header
        currentDate={currentDate}
        viewType={viewType}
        onViewTypeChange={setViewType}
        onNavigateBack={navigateBack}
        onNavigateForward={navigateForward}
        onNavigateToday={navigateToday}
        onCreateEvent={createEvent}
        onOpenSearch={toggleCommandMenu}
        onSync={handleSync}
        isMobile={isMobile}
        onToggleMobileSidebar={() => setMobileSidebarOpen((p) => !p)}
      />
      <div className="flex flex-1 overflow-hidden">
        {isMobile && mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72 animate-slide-in-left safe-top">
              <Sidebar
                selectedDate={currentDate}
                onDateSelect={(date) => {
                  router.push("/dashboard");
                  setMobileSidebarOpen(false);
                }}
                calendarGroups={calendarGroups}
                onToggleCalendar={handleToggleCalendar}
                onChangeCalendarColor={handleChangeCalendarColor}
                onRenameCalendar={handleRenameCalendar}
                onDeleteCalendar={handleDeleteCalendar}
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
        {!isMobile && (
          <Sidebar
            selectedDate={currentDate}
            onDateSelect={(date) => {}} // Handle navigation via URL in real app
            calendarGroups={calendarGroups}
            onToggleCalendar={handleToggleCalendar}
            onChangeCalendarColor={handleChangeCalendarColor}
            onRenameCalendar={handleRenameCalendar}
            onDeleteCalendar={handleDeleteCalendar}
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
      {isMobile && (
        <MobileNav
          viewType={viewType}
          onViewTypeChange={setViewType}
        />
      )}
      <CommandMenu
        onCreateEvent={createEvent}
        onNavigateToSettings={() => router.push("/settings")}
        onNavigateToday={navigateToday}
        onNavigateToTasks={() => router.push("/dashboard/tasks")}
        onNavigateToFocus={() => router.push("/dashboard/today")}
        onEventClick={openEvent}
      />
      <OnboardingModal />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <CalendarProvider>
          <OnboardingProvider>
            <DragProvider>
              <DashboardInner>{children}</DashboardInner>
            </DragProvider>
          </OnboardingProvider>
        </CalendarProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
