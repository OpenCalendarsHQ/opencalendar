"use client";

import { useMemo } from "react";
import { getMonthDays, formatWeekDay, formatDayNumber, isToday, isSameMonth, getWeekDays, getWeekNumber } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { isEventOnDay, toDateKey } from "@/lib/utils/multi-day";
import type { CalendarEvent, Todo } from "@/lib/types";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

export function MonthView({ currentDate, events, todos, onEventClick, onDayClick }: MonthViewProps) {
  const { settings } = useSettings();
  const monthDays = useMemo(() => getMonthDays(currentDate, settings.weekStartsOn), [currentDate, settings.weekStartsOn]);
  const weekDayHeaders = useMemo(
    () => getWeekDays(new Date(), settings.weekStartsOn).map((d) => formatWeekDay(d)),
    [settings.weekStartsOn]
  );

  // Pre-compute events per day (including multi-day events on each day they span)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    monthDays.forEach((day) => {
      const dayKey = toDateKey(day);
      map.set(dayKey, events.filter((e) => isEventOnDay(e, day)));
    });
    return map;
  }, [events, monthDays]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    todos.forEach((todo) => {
      if (!todo.dueDate || todo.completed) return;
      const key = toDateKey(todo.dueDate);
      const existing = map.get(key) || [];
      existing.push(todo);
      map.set(key, existing);
    });
    return map;
  }, [todos]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) result.push(monthDays.slice(i, i + 7));
    return result;
  }, [monthDays]);

  const showWeekNums = settings.showWeekNumbers;
  const cols = showWeekNums ? "32px repeat(7, 1fr)" : "repeat(7, 1fr)";

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: cols }}>
        {showWeekNums && (
          <div className="border-r border-border-light px-1 py-2 text-center text-[9px] font-medium text-muted-foreground">#</div>
        )}
        {weekDayHeaders.map((day, i) => (
          <div key={i} className="border-r border-border-light px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col">
        {weeks.map((week, weekIdx) => (
          <div
            key={weekIdx}
            className="grid flex-1 border-b border-border-light last:border-b-0"
            style={{ gridTemplateColumns: cols }}
          >
            {showWeekNums && (
              <div className="flex items-start justify-center border-r border-border-light pt-1 text-[9px] font-medium text-muted-foreground">
                {getWeekNumber(week[0], settings.weekStartsOn)}
              </div>
            )}
            {week.map((day) => {
              const dayKey = toDateKey(day);
              const dayEvents = eventsByDay.get(dayKey) || [];
              const dayTodos = todosByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div key={dayKey}
                  className={`min-h-[60px] cursor-pointer border-r border-border-light p-0.5 last:border-r-0 hover:bg-muted/50 md:min-h-[100px] md:p-1 ${
                    !isCurrentMonth ? "bg-muted/30" : ""
                  }`}
                  onClick={() => onDayClick(day)}>
                  <div className="flex justify-center">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md font-pixel text-[10px] md:h-6 md:w-6 md:text-xs ${
                      today ? "bg-foreground font-bold text-background" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"
                    }`}>
                      {formatDayNumber(day)}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-px">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button key={`${event.id}-${dayKey}`} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        className="flex w-full items-center gap-1 truncate rounded-sm px-0.5 py-px text-left text-[9px] hover:bg-muted md:px-1 md:text-[10px]">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: event.color || "#737373" }} />
                        <span className="hidden truncate text-foreground md:inline">{event.title}</span>
                      </button>
                    ))}
                    {dayTodos.slice(0, 1).map((todo) => (
                      <div key={todo.id} className="hidden items-center gap-1 truncate px-1 py-px text-[10px] text-muted-foreground md:flex">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                        <span className="truncate">{todo.title}</span>
                      </div>
                    ))}
                    {dayEvents.length + dayTodos.length > 3 && (
                      <div className="hidden px-1 text-[9px] text-muted-foreground md:block">+{dayEvents.length + dayTodos.length - 3} meer</div>
                    )}
                    {/* Mobile: show count only */}
                    {dayEvents.length > 2 && (
                      <div className="px-0.5 text-center text-[8px] text-muted-foreground md:hidden">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
