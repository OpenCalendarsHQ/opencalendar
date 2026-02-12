"use client";

import { useMemo, memo, useCallback, useState, useEffect } from "react";
import {
  getWeekDays, formatWeekDay, formatDayNumber, isToday,
  getTimePosition, getEventHeight, getWeekNumber,
} from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { TimeGrid, HOUR_HEIGHT } from "./time-grid";
import { EventCard, AllDayEventCard } from "./event-card";
import { computeEventLayout } from "@/lib/utils/event-layout";
import {
  splitMultiDayTimedEvents,
  computeMultiDaySpans,
  isMultiDayEvent,
  toDateKey,
} from "@/lib/utils/multi-day";
import type { CalendarEvent, Todo } from "@/lib/types";
import type { SerializedEvent } from "@/lib/utils/event-drag";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  onDragCreate?: (date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
  onTaskDrop?: (task: any, date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
  onEventDrop?: (event: SerializedEvent, date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
}

const DayColumn = memo(function DayColumn({
  layoutEvents,
  onEventClick,
}: {
  dayKey: string;
  layoutEvents: ReturnType<typeof computeEventLayout>;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="relative flex-1">
      {layoutEvents.map((event) => {
        const top = getTimePosition(event.startTime, HOUR_HEIGHT);
        const height = Math.max(getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT), 20);
        return (
          <EventCard
            key={event.id}
            event={event}
            style={{ top: `${top}px`, height: `${height}px` }}
            onClick={onEventClick}
          />
        );
      })}
    </div>
  );
});

export const WeekView = memo(function WeekView({ 
  currentDate, 
  events, 
  todos, 
  onEventClick, 
  onDragCreate, 
  onTaskDrop,
  onEventDrop,
}: WeekViewProps) {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentDate, settings.weekStartsOn), [currentDate, settings.weekStartsOn]);

  // Separate: all-day + multi-day go to header, single-day timed go to grid
  const { multiDaySpans, singleDayAllDay } = useMemo(() => {
    const allDayAndMultiDay = events.filter((e) => e.isAllDay || isMultiDayEvent(e));
    const spans = computeMultiDaySpans(allDayAndMultiDay, weekDays);

    const singleDay = new Map<string, CalendarEvent[]>();
    const multiDay = spans.filter((s) => s.span > 1);

    for (const s of spans) {
      if (s.span === 1) {
        const key = toDateKey(weekDays[s.startCol]);
        const arr = singleDay.get(key) || [];
        arr.push(s.event);
        singleDay.set(key, arr);
      }
    }

    return { multiDaySpans: multiDay, singleDayAllDay: singleDay };
  }, [events, weekDays]);

  // For each day, compute timed event layout
  const layoutByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeEventLayout>>();
    weekDays.forEach((day) => {
      const dayKey = toDateKey(day);
      const dayEvents = splitMultiDayTimedEvents(events, day);
      map.set(dayKey, computeEventLayout(dayEvents));
    });
    return map;
  }, [weekDays, events]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    weekDays.forEach((day) => {
      const dayKey = toDateKey(day);
      map.set(dayKey, todos.filter((t) => {
        if (!t.dueDate || t.completed) return false;
        return toDateKey(t.dueDate) === dayKey;
      }));
    });
    return map;
  }, [weekDays, todos]);

  const weekNumber = settings.showWeekNumbers ? getWeekNumber(currentDate, settings.weekStartsOn) : null;

  const handleDragCreate = useCallback((date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    if (onDragCreate) {
      onDragCreate(date, startHour, startMinute, endHour, endMinute);
    }
  }, [onDragCreate]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border">
        <div className="flex">
          <div className="flex w-[36px] shrink-0 items-end justify-center pb-1 md:w-[52px]">
            {mounted && weekNumber !== null && (
              <span className="text-[9px] font-medium text-muted-foreground">W{weekNumber}</span>
            )}
          </div>
          {weekDays.map((day) => {
            const today = isToday(day);
            const dayKey = toDateKey(day);

            return (
              <div key={dayKey} className="flex flex-1 flex-col items-center border-l border-border-light py-1.5">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${mounted && today ? "text-foreground" : "text-muted-foreground"}`}>
                  {formatWeekDay(day)}
                </span>
                <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md font-pixel text-sm ${
                  mounted && today ? "bg-foreground font-bold text-background" : "text-foreground"
                }`}>
                  {formatDayNumber(day)}
                </span>
              </div>
            );
          })}
        </div>

        {(multiDaySpans.length > 0 || Array.from(singleDayAllDay.values()).some((v) => v.length > 0)) && (
          <div className="relative border-t border-border-light">
            <div className="flex">
              <div className="w-[36px] shrink-0 md:w-[52px]" />
              <div className="relative flex flex-1">
                {multiDaySpans.map((span, idx) => (
                  <div
                    key={`${span.event.id}-md`}
                    className="relative"
                    style={{
                      position: "absolute",
                      top: `${idx * 22}px`,
                      left: `${(span.startCol / 7) * 100}%`,
                      width: `${(span.span / 7) * 100}%`,
                      height: "20px",
                      padding: "0 2px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(span.event);
                      }}
                      className="flex h-full w-full items-center gap-1 truncate rounded-[4px] border border-border/50 bg-card px-2 text-left text-[10px] font-medium text-foreground hover:bg-card-hover"
                    >
                      <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: span.event.color || "#737373" }} />
                      <span className="truncate">{span.event.title}</span>
                    </button>
                  </div>
                ))}

                {weekDays.map((day, colIdx) => {
                  const dayKey = toDateKey(day);
                  const dayAllDay = singleDayAllDay.get(dayKey) || [];
                  const dayTodos = todosByDay.get(dayKey) || [];
                  if (dayAllDay.length === 0 && dayTodos.length === 0) return null;

                  const topOffset = multiDaySpans.length * 22;

                  return (
                    <div
                      key={`${dayKey}-allday`}
                      className="absolute space-y-0.5 px-0.5"
                      style={{
                        left: `${(colIdx / 7) * 100}%`,
                        width: `${(1 / 7) * 100}%`,
                        top: `${topOffset}px`,
                      }}
                    >
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
                  );
                })}
              </div>
            </div>

            <div style={{
              height: (multiDaySpans.length * 22) + (Array.from(singleDayAllDay.values()).some((v) => v.length > 0) ? 22 : 0) + 2,
            }} />
          </div>
        )}
      </div>

      <TimeGrid columnCount={7} dates={weekDays} onDragCreate={handleDragCreate} onTaskDrop={onTaskDrop} onEventDrop={onEventDrop}>
        {weekDays.map((day) => {
          const dayKey = toDateKey(day);
          const layoutEvents = layoutByDay.get(dayKey) || [];

          return (
            <DayColumn
              key={dayKey}
              dayKey={dayKey}
              layoutEvents={layoutEvents}
              onEventClick={onEventClick}
            />
          );
        })}
      </TimeGrid>
    </div>
  );
});
