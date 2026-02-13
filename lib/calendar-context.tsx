"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { addWeeks, subWeeks, addMonths, subMonths, addDays } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import type { CalendarViewType, CalendarGroup, CalendarItem } from "@/lib/types";

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
  visibleCalendarIds: Set<string>;
  setVisibleCalendarIds: Dispatch<SetStateAction<Set<string>>>;
  calendarGroups: CalendarGroup[];
  setCalendarGroups: Dispatch<SetStateAction<CalendarGroup[]>>;
  isLoadingCalendars: boolean;
  refreshCalendars: () => Promise<void>;
  commandMenuOpen: boolean;
  setCommandMenuOpen: Dispatch<SetStateAction<boolean>>;
  toggleCommandMenu: () => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

const VIEW_PREF_KEY = "opencalendar_view_preferences";

function loadViewPreferences(): CalendarViewType | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(VIEW_PREF_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (["day", "week", "month", "year"].includes(parsed?.viewType)) {
        return parsed.viewType;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewTypeState] = useState<CalendarViewType>(
    () => loadViewPreferences() || settings.defaultView || "week"
  );

  const setViewType = useCallback((type: CalendarViewType) => {
    setViewTypeState(type);
    try {
      localStorage.setItem(VIEW_PREF_KEY, JSON.stringify({ viewType: type }));
    } catch {
      // ignore
    }
  }, []);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  
  const createEventRef = useRef<(() => void) | null>(null);
  const openEventRef = useRef<((eventId: string) => void) | null>(null);
  const refreshEventsRef = useRef<(() => void) | null>(null);

  const refreshCalendars = useCallback(async (force = false) => {
    setIsLoadingCalendars(true);
    try {
      const res = await fetch("/api/calendars");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCalendarGroups(data);

          // Only update visibleCalendarIds if they haven't been touched yet or after fresh fetch
          // We generally want to respect the user's current session visibility
          // But for the initial load, we sync with data
          const visible = new Set<string>();
          data.forEach((group: CalendarGroup) => {
            group.calendars.forEach((cal: CalendarItem) => {
              if (cal.isVisible) visible.add(cal.id);
            });
          });
          setVisibleCalendarIds(visible);

          // Cache with timestamp
          const cacheData = {
            data,
            timestamp: Date.now(),
          };
          localStorage.setItem("opencalendar_calendars", JSON.stringify(cacheData));
        }
      }
    } catch (err) {
      console.error("Failed to fetch calendars:", err);
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  // Initial load from cache then refresh if stale
  useEffect(() => {
    const cached = localStorage.getItem("opencalendar_calendars");
    let shouldRefresh = true;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Support both old format (direct data) and new format (with timestamp)
        const data = parsed.data || parsed;
        const timestamp = parsed.timestamp || 0;

        setCalendarGroups(data);
        const visible = new Set<string>();
        data.forEach((group: CalendarGroup) => {
          group.calendars?.forEach((cal: any) => {
            if (cal.isVisible) visible.add(cal.id);
          });
        });
        setVisibleCalendarIds(visible);

        // Only refresh if cache is older than 5 minutes
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        const cacheAge = Date.now() - timestamp;
        shouldRefresh = cacheAge > CACHE_DURATION;
      } catch (e) {
        shouldRefresh = true;
      }
    }

    if (shouldRefresh) {
      refreshCalendars();
    } else {
      setIsLoadingCalendars(false);
    }
  }, [refreshCalendars]);

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
        visibleCalendarIds,
        setVisibleCalendarIds,
        calendarGroups,
        setCalendarGroups,
        isLoadingCalendars,
        refreshCalendars,
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
