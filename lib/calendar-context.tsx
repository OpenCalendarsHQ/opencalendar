"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { addWeeks, subWeeks, addMonths, subMonths, addDays } from "@/lib/utils/date";
import type { CalendarViewType } from "@/lib/types";

interface CalendarContextValue {
  currentDate: Date;
  viewType: CalendarViewType;
  setCurrentDate: (date: Date) => void;
  setViewType: (type: CalendarViewType) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateToday: () => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>("week");

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

  return (
    <CalendarContext.Provider
      value={{
        currentDate,
        viewType,
        setCurrentDate,
        setViewType,
        navigateBack,
        navigateForward,
        navigateToday,
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
