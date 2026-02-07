"use client";

import { useMemo } from "react";
import {
  getWeekDays,
  formatWeekDay,
  formatDayNumber,
  isToday,
  isSameDay,
  getTimePosition,
  getEventHeight,
} from "@/lib/utils/date";
import { TimeGrid, HOUR_HEIGHT } from "./time-grid";
import { EventCard, AllDayEventCard } from "./event-card";
import type { CalendarEvent, Todo } from "@/lib/types";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

export function WeekView({ currentDate, events, todos, onEventClick, onTimeSlotClick }: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const allDayEvents = useMemo(() => events.filter((e) => e.isAllDay), [events]);
  const timedEvents = useMemo(() => events.filter((e) => !e.isAllDay), [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekDays.forEach((day) => {
      const dayKey = day.toISOString().split("T")[0];
      map.set(dayKey, timedEvents.filter((e) => isSameDay(e.startTime, day)));
    });
    return map;
  }, [weekDays, timedEvents]);

  const allDayByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekDays.forEach((day) => {
      const dayKey = day.toISOString().split("T")[0];
      map.set(dayKey, allDayEvents.filter((e) => isSameDay(e.startTime, day)));
    });
    return map;
  }, [weekDays, allDayEvents]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    weekDays.forEach((day) => {
      const dayKey = day.toISOString().split("T")[0];
      map.set(dayKey, todos.filter((t) => {
        if (!t.dueDate || t.completed) return false;
        return t.dueDate.toISOString().split("T")[0] === dayKey;
      }));
    });
    return map;
  }, [weekDays, todos]);

  return (
    <div className="flex h-full flex-col">
      {/* Day headers */}
      <div className="flex shrink-0 border-b border-border">
        <div className="w-[52px] shrink-0" />
        {weekDays.map((day) => {
          const today = isToday(day);
          const dayKey = day.toISOString().split("T")[0];
          const dayAllDay = allDayByDay.get(dayKey) || [];
          const dayTodos = todosByDay.get(dayKey) || [];

          return (
            <div key={dayKey} className="flex flex-1 flex-col items-center border-l border-border-light py-1.5">
              <span className={`text-[10px] font-medium uppercase tracking-wider ${today ? "text-foreground" : "text-muted-foreground"}`}>
                {formatWeekDay(day)}
              </span>
              <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md font-pixel text-sm ${
                today ? "bg-foreground font-bold text-background" : "text-foreground"
              }`}>
                {formatDayNumber(day)}
              </span>

              {(dayAllDay.length > 0 || dayTodos.length > 0) && (
                <div className="mt-1 w-full space-y-0.5 px-0.5">
                  {dayAllDay.map((event) => (
                    <AllDayEventCard key={event.id} event={event} onClick={onEventClick} />
                  ))}
                  {dayTodos.map((todo) => (
                    <div key={todo.id} className="flex w-full items-center gap-1 truncate rounded-[4px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <span className="truncate">{todo.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <TimeGrid columnCount={7} dates={weekDays}>
        {weekDays.map((day) => {
          const dayKey = day.toISOString().split("T")[0];
          const dayEvents = eventsByDay.get(dayKey) || [];

          return (
            <div
              key={dayKey}
              className="relative flex-1"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top + (e.currentTarget.closest('[class*="overflow-y"]')?.scrollTop || 0);
                const hour = Math.floor(y / HOUR_HEIGHT);
                onTimeSlotClick(day, Math.min(23, Math.max(0, hour)));
              }}
            >
              {dayEvents.map((event) => {
                const top = getTimePosition(event.startTime, HOUR_HEIGHT);
                const height = getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT);
                return (
                  <EventCard key={event.id} event={event} style={{ top: `${top}px`, height: `${height}px` }} onClick={onEventClick} />
                );
              })}
            </div>
          );
        })}
      </TimeGrid>
    </div>
  );
}
