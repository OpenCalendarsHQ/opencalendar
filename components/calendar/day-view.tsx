"use client";

import { useMemo } from "react";
import { formatDateFull, isToday, isSameDay, getTimePosition, getEventHeight } from "@/lib/utils/date";
import { TimeGrid, HOUR_HEIGHT } from "./time-grid";
import { EventCard, AllDayEventCard } from "./event-card";
import type { CalendarEvent, Todo } from "@/lib/types";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  onToggleTodo: (id: string) => void;
}

export function DayView({ currentDate, events, todos, onEventClick, onTimeSlotClick, onToggleTodo }: DayViewProps) {
  const dayEvents = useMemo(() => events.filter((e) => isSameDay(e.startTime, currentDate) && !e.isAllDay), [events, currentDate]);
  const allDayEvents = useMemo(() => events.filter((e) => isSameDay(e.startTime, currentDate) && e.isAllDay), [events, currentDate]);
  const dayTodos = useMemo(() => {
    const dayKey = currentDate.toISOString().split("T")[0];
    return todos.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      return t.dueDate.toISOString().split("T")[0] === dayKey;
    });
  }, [todos, currentDate]);

  const today = isToday(currentDate);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 border-b border-border">
        <div className="w-[52px] shrink-0" />
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

      <TimeGrid columnCount={1} dates={[currentDate]}>
        <div className="relative flex-1"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const hour = Math.floor(y / HOUR_HEIGHT);
            onTimeSlotClick(currentDate, Math.min(23, Math.max(0, hour)));
          }}>
          {dayEvents.map((event) => {
            const top = getTimePosition(event.startTime, HOUR_HEIGHT);
            const height = getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT);
            return <EventCard key={event.id} event={event} style={{ top: `${top}px`, height: `${height}px` }} onClick={onEventClick} />;
          })}
        </div>
      </TimeGrid>
    </div>
  );
}
