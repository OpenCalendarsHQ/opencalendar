"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getMonthDays, formatMonthYear, formatWeekDay, formatDayNumber,
  isSameDay, isSameMonth, isToday, addMonths, subMonths, getWeekDays,
} from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function MiniCalendar({ selectedDate, onDateSelect }: MiniCalendarProps) {
  const { settings } = useSettings();
  const [viewMonth, setViewMonth] = useState(new Date());
  const monthDays = getMonthDays(viewMonth, settings.weekStartsOn);
  const weekDayHeaders = getWeekDays(new Date(), settings.weekStartsOn).map((d) =>
    formatWeekDay(d).charAt(0).toUpperCase()
  );

  return (
    <div className="px-3 pb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium capitalize text-foreground">{formatMonthYear(viewMonth)}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mb-0.5 grid grid-cols-7">
        {weekDayHeaders.map((day, i) => (
          <div key={i} className="py-0.5 text-center text-[9px] font-medium text-muted-foreground">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthDays.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button key={i} onClick={() => onDateSelect(day)}
              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md font-pixel text-[10px] ${
                isSelected
                  ? "bg-foreground font-bold text-background"
                  : isTodayDate
                  ? "font-bold text-foreground underline underline-offset-2"
                  : isCurrentMonth
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground/30 hover:bg-muted/50"
              }`}>
              {formatDayNumber(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
