"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { addWeeks, subWeeks, addMonths, subMonths, addDays } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import type { CalendarViewType } from "@/lib/types";

interface CalendarContextValue {
  currentDate: Date;
  viewType: CalendarViewType;
  weekStartsOn: 0 | 1;
  setCurrentDate: (date: Date) => void;
  setViewType: (type: CalendarViewType) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateToday: () => void;
  registerCreateEvent: (fn: () => void) => void;
  createEvent: () => void;
  registerOpenEvent: (fn: (eventId: string) => void) => void;
  openEvent: (eventId: string) => void;
  registerRefreshEvents: (fn: () => void) => void;
  refreshEvents: () => void;
  commandMenuOpen: boolean;
  setCommandMenuOpen: Dispatch<SetStateAction<boolean>>;
  toggleCommandMenu: () => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>(settings.defaultView || "week");
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const createEventRef = useRef<(() => void) | null>(null);
  const openEventRef = useRef<((eventId: string) => void) | null>(null);
  const refreshEventsRef = useRef<(() => void) | null>(null);

  const navigateBack = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewType === "week") return subWeeks(prev, 1);
      if (viewType === "month") return subMonths(prev, 1);
      return addDays(prev, -1);
    });
  }, [viewType]);

  const navigateForward = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewType === "week") return addWeeks(prev, 1);
      if (viewType === "month") return addMonths(prev, 1);
      return addDays(prev, 1);
    });
  }, [viewType]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const registerCreateEvent = useCallback((fn: () => void) => {
    createEventRef.current = fn;
  }, []);

  const createEvent = useCallback(() => {
    createEventRef.current?.();
  }, []);

  const registerOpenEvent = useCallback((fn: (eventId: string) => void) => {
    openEventRef.current = fn;
  }, []);

  const openEvent = useCallback((eventId: string) => {
    openEventRef.current?.(eventId);
  }, []);

  const toggleCommandMenu = useCallback(() => {
    setCommandMenuOpen((prev) => !prev);
  }, []);

  const registerRefreshEvents = useCallback((fn: () => void) => {
    refreshEventsRef.current = fn;
  }, []);

  const refreshEvents = useCallback(() => {
    refreshEventsRef.current?.();
  }, []);

  return (
    <CalendarContext.Provider
      value={{
        currentDate,
        viewType,
        weekStartsOn: settings.weekStartsOn,
        setCurrentDate,
        setViewType,
        navigateBack,
        navigateForward,
        navigateToday,
        registerCreateEvent,
        createEvent,
        registerOpenEvent,
        openEvent,
        registerRefreshEvents,
        refreshEvents,
        commandMenuOpen,
        setCommandMenuOpen,
        toggleCommandMenu,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}
