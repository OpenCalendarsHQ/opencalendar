"use client";

import { useMemo, memo, useCallback } from "react";
import { formatDateFull, isToday, getTimePosition, getEventHeight } from "@/lib/utils/date";
import { TimeGrid, HOUR_HEIGHT } from "./time-grid";
import { EventCard, AllDayEventCard } from "./event-card";
import { computeEventLayout } from "@/lib/utils/event-layout";
import { splitMultiDayTimedEvents, isEventOnDay } from "@/lib/utils/multi-day";
import type { CalendarEvent, Todo } from "@/lib/types";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  onToggleTodo: (id: string) => void;
  onDragCreate?: (date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
}

export const DayView = memo(function DayView({ currentDate, events, todos, onEventClick, onTimeSlotClick, onToggleTodo, onDragCreate }: DayViewProps) {
  // Timed events for this day (including clipped multi-day timed events)
  const dayEvents = useMemo(
    () => splitMultiDayTimedEvents(events, currentDate),
    [events, currentDate]
  );

  // All-day events that are active on this day (single-day or multi-day)
  const allDayEvents = useMemo(
    () => events.filter((e) => e.isAllDay && isEventOnDay(e, currentDate)),
    [events, currentDate]
  );

  const layoutEvents = useMemo(() => computeEventLayout(dayEvents), [dayEvents]);

  const dayTodos = useMemo(() => {
    const dayKey = currentDate.toISOString().split("T")[0];
    return todos.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      return t.dueDate.toISOString().split("T")[0] === dayKey;
    });
  }, [todos, currentDate]);

  const today = isToday(currentDate);

  const handleDragCreate = useCallback((date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    if (onDragCreate) {
      onDragCreate(date, startHour, startMinute, endHour, endMinute);
    }
  }, [onDragCreate]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 border-b border-border">
        <div className="w-[36px] shrink-0 md:w-[52px]" />
        <div className="flex flex-1 flex-col items-center border-l border-border-light py-2">
          <span className={`font-pixel text-base capitalize ${today ? "font-bold text-foreground" : "text-foreground"}`}>
            {formatDateFull(currentDate)}
          </span>
          {(allDayEvents.length > 0 || dayTodos.length > 0) && (
            <div className="mt-1.5 flex w-full max-w-2xl flex-wrap gap-1 px-4">
              {allDayEvents.map((event) => (
                <AllDayEventCard key={event.id} event={event} onClick={onEventClick} />
              ))}
              {dayTodos.map((todo) => (
                <button key={todo.id} onClick={() => onToggleTodo(todo.id)}
                  className="flex items-center gap-1 rounded-[4px] border border-border px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  {todo.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TimeGrid columnCount={1} dates={[currentDate]} onDragCreate={handleDragCreate}>
        <div className="relative flex-1">
          {layoutEvents.map((event) => {
            const top = getTimePosition(event.startTime, HOUR_HEIGHT);
            const height = Math.max(getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT), 20);
            return <EventCard key={event.id} event={event} style={{ top: `${top}px`, height: `${height}px` }} onClick={onEventClick} />;
          })}
        </div>
      </TimeGrid>
    </div>
  );
});
