"use client";

import { useMemo, memo } from "react";
import {
  getMonthDays,
  formatWeekDay,
  formatDayNumber,
  isToday,
  isSameMonth,
  getWeekDays,
  addMonths,
  startOfYear,
  format,
} from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { isEventOnDay, toDateKey } from "@/lib/utils/multi-day";
import type { CalendarEvent, Todo } from "@/lib/types";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onMonthClick: (date: Date) => void;
}

interface MiniMonthProps {
  date: Date;
  events: CalendarEvent[];
  weekStartsOn: 0 | 1;
  onDayClick: (date: Date) => void;
  onMonthClick: (date: Date) => void;
}

const MiniMonth = memo(function MiniMonth({
  date,
  events,
  weekStartsOn,
  onDayClick,
  onMonthClick,
}: MiniMonthProps) {
  const monthDays = useMemo(() => getMonthDays(date, weekStartsOn), [date, weekStartsOn]);

  const weekDayHeaders = useMemo(
    () => getWeekDays(new Date(), weekStartsOn).map((d) => formatWeekDay(d)),
    [weekStartsOn]
  );

  // Pre-compute events per day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    monthDays.forEach((day) => {
      const dayKey = toDateKey(day);
      map.set(dayKey, events.filter((e) => isEventOnDay(e, day)));
    });
    return map;
  }, [events, monthDays]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) result.push(monthDays.slice(i, i + 7));
    return result;
  }, [monthDays]);

  return (
    <div className="flex flex-col rounded-md border border-border bg-card">
      {/* Month header */}
      <button
        onClick={() => onMonthClick(date)}
        className="border-b border-border px-2 py-1.5 text-center text-xs font-medium capitalize text-foreground hover:bg-muted"
      >
        {format(date, "MMMM yyyy")}
      </button>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border-light">
        {weekDayHeaders.map((day, i) => (
          <div
            key={i}
            className="px-0.5 py-0.5 text-center text-[8px] font-medium uppercase text-muted-foreground"
          >
            {day.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex flex-col">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7">
            {week.map((day) => {
              const dayKey = toDateKey(day);
              const dayEvents = eventsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, date);
              const today = isToday(day);
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={dayKey}
                  onClick={() => onDayClick(day)}
                  className={`relative flex aspect-square min-h-[24px] items-center justify-center text-[9px] hover:bg-muted ${
                    !isCurrentMonth ? "text-muted-foreground/30" : ""
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-sm ${
                      today
                        ? "bg-foreground font-bold text-background"
                        : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {formatDayNumber(day)}
                  </span>
                  {hasEvents && isCurrentMonth && (
                    <div className="absolute bottom-0.5 flex gap-px">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className="h-0.5 w-0.5 rounded-full"
                          style={{ backgroundColor: event.color || "#737373" }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export const YearView = memo(function YearView({
  currentDate,
  events,
  todos,
  onEventClick,
  onDayClick,
  onMonthClick,
}: YearViewProps) {
  const { settings } = useSettings();
  const yearStart = useMemo(() => startOfYear(currentDate), [currentDate]);

  // Generate all 12 months of the year
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [yearStart]);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => (
          <MiniMonth
            key={month.toISOString()}
            date={month}
            events={events}
            weekStartsOn={settings.weekStartsOn}
            onDayClick={onDayClick}
            onMonthClick={onMonthClick}
          />
        ))}
      </div>
    </div>
  );
});
