"use client";

import { useMemo, memo, useState, useEffect } from "react";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { getMonthDays, getWeekDays, formatWeekDay, formatDayNumber } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { isEventOnDay, toDateKey } from "@/lib/utils/multi-day";
import type { CalendarEvent, Todo } from "@/lib/types";

interface MobileMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

export const MobileMonthView = memo(function MobileMonthView({
  currentDate,
  events,
  todos,
  onEventClick,
  onDayClick,
}: MobileMonthViewProps) {
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState(currentDate);

  // Sync selectedDate when navigating to different month
  useEffect(() => {
    if (!isSameMonth(selectedDate, currentDate)) {
      setSelectedDate(currentDate);
    }
  }, [currentDate, selectedDate]);

  const monthDays = useMemo(
    () => getMonthDays(currentDate, settings.weekStartsOn),
    [currentDate, settings.weekStartsOn]
  );
  const weekDayHeaders = useMemo(
    () => getWeekDays(new Date(), settings.weekStartsOn).map((d) => formatWeekDay(d)),
    [settings.weekStartsOn]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    monthDays.forEach((day) => {
      const dayKey = toDateKey(day);
      map.set(dayKey, events.filter((e) => isEventOnDay(e, day)));
    });
    return map;
  }, [events, monthDays]);

  const selectedDayEvents = useMemo(() => {
    const dayKey = toDateKey(selectedDate);
    return eventsByDay.get(dayKey) || [];
  }, [eventsByDay, selectedDate]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      result.push(monthDays.slice(i, i + 7));
    }
    return result;
  }, [monthDays]);

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    // Don't switch to day view - stay in month view and show events below
  };

  return (
    <div className="flex h-full flex-col safe-left safe-right">
      {/* Calendar grid */}
      <div className="shrink-0 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-7 border-b border-border">
          {weekDayHeaders.map((day, i) => (
            <div
              key={i}
              className="py-1 text-center text-[9px] font-medium uppercase text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const dayKey = toDateKey(day);
            const dayEvents = eventsByDay.get(dayKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <button
                key={dayKey}
                onClick={() => handleDayPress(day)}
                className={`min-h-[44px] flex flex-col items-center p-0.5 border-b border-r border-border-light last:border-r-0 hover:bg-muted/50 ${
                  !isCurrentMonth ? "bg-muted/20" : ""
                } ${isSelected ? "bg-accent/20" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-medium ${
                    today
                      ? "bg-foreground font-bold text-background"
                      : isSelected
                      ? "bg-accent text-accent-foreground"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {formatDayNumber(day)}
                </span>

                {/* Event indicators - lijstweergave */}
                {dayEvents.length > 0 && (
                  <div className="mt-0.5 flex gap-0.5 justify-center">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="h-1 w-1.5 rounded-sm"
                        style={{ backgroundColor: e.color || "#737373" }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events - always shown below */}
      <div className="flex-1 overflow-auto mt-3 border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-sm font-semibold text-foreground">
            {format(selectedDate, "EEEE d MMMM", { locale: nl })}
          </h3>
          <button
            onClick={() => onDayClick(selectedDate)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Dagweergave
          </button>
        </div>
        {selectedDayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4">Geen events op deze dag</p>
        ) : (
          <div className="space-y-2 px-2">
            {selectedDayEvents
              .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
              .map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                >
                  <div
                    className="h-full w-1 shrink-0 rounded-full min-h-[32px]"
                    style={{ backgroundColor: event.color || "#737373" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.isAllDay
                        ? "Hele dag"
                        : `${format(event.startTime, "HH:mm", { locale: nl })} - ${format(event.endTime, "HH:mm", { locale: nl })}`}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground truncate">📍 {event.location}</p>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
});
