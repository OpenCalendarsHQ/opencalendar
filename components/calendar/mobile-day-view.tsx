"use client";

import { useMemo, memo } from "react";
import { format, addDays, isSameDay, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { TimeGrid, HOUR_HEIGHT } from "./time-grid";
import { EventCard, AllDayEventCard } from "./event-card";
import { computeEventLayout } from "@/lib/utils/event-layout";
import { splitMultiDayTimedEvents, isEventOnDay } from "@/lib/utils/multi-day";
import { getTimePosition, getEventHeight } from "@/lib/utils/date";
import type { CalendarEvent, Todo } from "@/lib/types";

export type DayViewMode = "day" | "multi" | "list";

interface MobileDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  dayViewMode: DayViewMode;
  onDayViewModeChange: (mode: DayViewMode) => void;
  onEventClick: (event: CalendarEvent) => void;
  onToggleTodo: (id: string) => void;
  onDragCreate?: (date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
}

export const MobileDayView = memo(function MobileDayView({
  currentDate,
  events,
  todos,
  dayViewMode,
  onDayViewModeChange,
  onEventClick,
  onToggleTodo,
  onDragCreate,
}: MobileDayViewProps) {
  // Dag: single day
  const dayEvents = useMemo(
    () => splitMultiDayTimedEvents(events, currentDate),
    [events, currentDate]
  );
  const allDayEvents = useMemo(
    () => events.filter((e) => e.isAllDay && isEventOnDay(e, currentDate)),
    [events, currentDate]
  );
  const layoutEvents = useMemo(() => computeEventLayout(dayEvents), [dayEvents]);

  // Meerdere dagen: currentDate + 2 dagen erna
  const multiDayRange = useMemo(() => {
    const start = startOfDay(currentDate);
    const end = endOfDay(addDays(currentDate, 2));
    return { start, end };
  }, [currentDate]);

  const multiDayEvents = useMemo(() => {
    return events
      .filter(
        (e) =>
          e.startTime <= multiDayRange.end &&
          e.endTime >= multiDayRange.start
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [events, multiDayRange]);

  // Lijst: komende events vanaf currentDate
  const listEvents = useMemo(() => {
    const start = startOfDay(currentDate);
    return events
      .filter((e) => e.startTime >= start)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 50);
  }, [events, currentDate]);

  const dayTodos = useMemo(() => {
    const dayKey = currentDate.toISOString().split("T")[0];
    return todos.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      return t.dueDate.toISOString().split("T")[0] === dayKey;
    });
  }, [todos, currentDate]);

  const dates = useMemo(
    () => [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)],
    [currentDate]
  );

  return (
    <div className="flex h-full flex-col safe-left safe-right">
      {/* View mode toggle - Apple style */}
      <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {(["day", "multi", "list"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onDayViewModeChange(mode)}
            className={`flex min-h-[36px] flex-1 items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              dayViewMode === mode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode === "day" ? "Dag" : mode === "multi" ? "3 dagen" : "Lijst"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {dayViewMode === "day" && (
          <div className="flex flex-col">
            <div className="shrink-0 border-b border-border py-2">
              <div className="text-center">
                <span className="font-pixel text-sm font-bold capitalize text-foreground">
                  {format(currentDate, "EEEE d MMMM", { locale: nl })}
                </span>
              </div>
              {(allDayEvents.length > 0 || dayTodos.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1 px-2">
                  {allDayEvents.map((event) => (
                    <AllDayEventCard key={event.id} event={event} onClick={onEventClick} />
                  ))}
                  {dayTodos.map((todo) => (
                    <button
                      key={todo.id}
                      onClick={() => onToggleTodo(todo.id)}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {todo.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <TimeGrid
              columnCount={1}
              dates={[currentDate]}
              onDragCreate={onDragCreate}
            >
              <div className="relative flex-1 min-h-[600px]">
                {layoutEvents.map((event) => {
                  const top = getTimePosition(event.startTime, HOUR_HEIGHT);
                  const height = Math.max(
                    getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT),
                    20
                  );
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
            </TimeGrid>
          </div>
        )}

        {dayViewMode === "multi" && (
          <div className="space-y-4 p-3">
            {dates.map((date) => {
              const dayEvs = multiDayEvents.filter((e) => isEventOnDay(e, date));
              return (
                <div key={date.toISOString()} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground sticky top-0 bg-background py-1">
                    {format(date, "EEEE d MMM", { locale: nl })}
                  </h3>
                  {dayEvs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Geen events</p>
                  ) : (
                    dayEvs.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                      >
                        <div
                          className="h-full w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color || "#737373" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.isAllDay
                              ? "Hele dag"
                              : `${format(event.startTime, "HH:mm", { locale: nl })} - ${format(event.endTime, "HH:mm", { locale: nl })}`}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dayViewMode === "list" && (
          <div className="space-y-2 p-3">
            {listEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Geen komende events
              </p>
            ) : (
              listEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                >
                  <div
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color || "#737373" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(event.startTime, "EEEE d MMM", { locale: nl })} ·{" "}
                      {event.isAllDay
                        ? "Hele dag"
                        : `${format(event.startTime, "HH:mm", { locale: nl })} - ${format(event.endTime, "HH:mm", { locale: nl })}`}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});
