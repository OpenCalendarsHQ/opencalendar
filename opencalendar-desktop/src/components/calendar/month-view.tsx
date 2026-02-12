import { useMemo, memo } from "react";
import { getMonthDays, formatWeekDay, formatDayNumber, isToday, isSameMonth, getWeekDays, getWeekNumber } from "../../lib/utils/date";
import { isEventOnDay, toDateKey } from "../../lib/utils/multi-day";
import type { CalendarEvent } from "../../lib/types";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  weekStartsOn?: 0 | 1;
  showWeekNumbers?: boolean;
}

export const MonthView = memo(function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  weekStartsOn = 1,
  showWeekNumbers = false,
}: MonthViewProps) {
  const monthDays = useMemo(() => getMonthDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);
  const weekDayHeaders = useMemo(
    () => getWeekDays(new Date(), weekStartsOn).map((d) => formatWeekDay(d)),
    [weekStartsOn]
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

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) result.push(monthDays.slice(i, i + 7));
    return result;
  }, [monthDays]);

  const cols = showWeekNumbers ? "32px repeat(7, 1fr)" : "repeat(7, 1fr)";
  const MAX_EVENTS_PER_DAY = 4; // Vaste aantal zichtbare events; rest als "+N meer"

  return (
    <div className="flex h-full flex-col">
        <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: cols }}>
        {showWeekNumbers && (
          <div className="border-r border-border px-1 py-2 text-center text-[9px] font-medium text-muted-foreground">#</div>
        )}
        {weekDayHeaders.map((day, i) => (
          <div key={i} className="border-r border-border px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid min-h-0" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, weekIdx) => (
          <div
            key={weekIdx}
            className="grid border-b border-border last:border-b-0 min-h-0"
            style={{ gridTemplateColumns: cols }}
          >
            {showWeekNumbers && (
              <div className="flex items-start justify-center border-r border-border pt-1 text-[9px] font-medium text-muted-foreground">
                {getWeekNumber(week[0], weekStartsOn)}
              </div>
            )}
            {week.map((day) => {
              const dayKey = toDateKey(day);
              const dayEvents = eventsByDay.get(dayKey) || [];
              const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
              const remainingCount = dayEvents.length - MAX_EVENTS_PER_DAY;
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div key={dayKey}
                  className={`h-full min-h-0 cursor-pointer border-r border-border p-0.5 last:border-r-0 hover:bg-muted/50 md:p-1 flex flex-col transition-colors ${
                    !isCurrentMonth ? "bg-muted/30" : ""
                  }`}
                  onClick={() => onDayClick(day)}>
                  <div className="flex justify-center shrink-0 mb-1">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-medium transition-all md:h-7 md:w-7 md:text-xs shrink-0 ${
                      today ? "bg-accent font-bold text-accent-foreground shadow-sm scale-110" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {formatDayNumber(day)}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1 overflow-hidden flex-1 min-h-0 px-1 flex flex-col">
                    {visibleEvents.map((event) => (
                      <button key={`${event.id}-${dayKey}`} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        className="flex w-full items-center gap-1.5 min-w-0 rounded-md px-1.5 py-1 text-left text-[10px] hover:opacity-90 md:text-[11px] font-medium transition-all active:scale-[0.98] shrink-0"
                        style={{
                          backgroundColor: `${event.color || "#737373"}15`,
                          borderLeft: `3px solid ${event.color || "#737373"}`,
                        }}>
                        <span className="truncate text-foreground pl-0.5">{event.title}</span>
                      </button>
                    ))}
                    {remainingCount > 0 && (
                      <span className="text-[10px] text-muted-foreground truncate shrink-0">
                        +{remainingCount} meer
                      </span>
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
});
