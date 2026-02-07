"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandMenu } from "@/components/layout/command-menu";
import { CalendarProvider, useCalendar } from "@/lib/calendar-context";
import { useTodos } from "@/hooks/use-todos";
import type { CalendarGroup } from "@/lib/types";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const calendar = useCalendar();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const { todos, lists, addTodo, toggleTodo, deleteTodo } = useTodos();
  const createEventRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        const res = await fetch("/api/calendars");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setCalendarGroups(data);
        }
      } catch {
        // No calendars yet
      }
    };
    fetchCalendars();
  }, []);

  const handleToggleCalendar = useCallback((calendarId: string) => {
    setCalendarGroups((prev) =>
      prev.map((group) => ({
        ...group,
        calendars: group.calendars.map((cal) =>
          cal.id === calendarId ? { ...cal, isVisible: !cal.isVisible } : cal
        ),
      }))
    );
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header
        currentDate={calendar.currentDate}
        viewType={calendar.viewType}
        onViewTypeChange={calendar.setViewType}
        onNavigateBack={calendar.navigateBack}
        onNavigateForward={calendar.navigateForward}
        onNavigateToday={calendar.navigateToday}
        onCreateEvent={() => createEventRef.current?.()}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedDate={calendar.currentDate}
          onDateSelect={calendar.setCurrentDate}
          calendarGroups={calendarGroups}
          onToggleCalendar={handleToggleCalendar}
          onAddAccount={() => router.push("/settings/accounts")}
          isCollapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((p) => !p)}
          todos={todos}
          todoLists={lists}
          onToggleTodo={toggleTodo}
          onAddTodo={addTodo}
          onDeleteTodo={deleteTodo}
        />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <CommandMenu
        onCreateEvent={() => createEventRef.current?.()}
        onNavigateToSettings={() => router.push("/settings")}
        onNavigateToday={calendar.navigateToday}
        onNavigateToTasks={() => router.push("/tasks")}
        onNavigateToFocus={() => router.push("/today")}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CalendarProvider>
      <DashboardInner>{children}</DashboardInner>
    </CalendarProvider>
  );
}
