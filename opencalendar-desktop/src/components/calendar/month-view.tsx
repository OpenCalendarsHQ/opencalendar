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

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 border-b border-gray-200" style={{ gridTemplateColumns: cols }}>
        {showWeekNumbers && (
          <div className="border-r border-gray-100 px-1 py-2 text-center text-[9px] font-medium text-gray-600">#</div>
        )}
        {weekDayHeaders.map((day, i) => (
          <div key={i} className="border-r border-gray-100 px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-gray-600 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col">
        {weeks.map((week, weekIdx) => (
          <div
            key={weekIdx}
            className="grid flex-1 border-b border-gray-100 last:border-b-0"
            style={{ gridTemplateColumns: cols }}
          >
            {showWeekNumbers && (
              <div className="flex items-start justify-center border-r border-gray-100 pt-1 text-[9px] font-medium text-gray-600">
                {getWeekNumber(week[0], weekStartsOn)}
              </div>
            )}
            {week.map((day) => {
              const dayKey = toDateKey(day);
              const dayEvents = eventsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div key={dayKey}
                  className={`min-h-[60px] cursor-pointer border-r border-gray-100 p-0.5 last:border-r-0 hover:bg-gray-50 md:min-h-[100px] md:p-1 flex flex-col ${
                    !isCurrentMonth ? "bg-gray-50/50" : ""
                  }`}
                  onClick={() => onDayClick(day)}>
                  <div className="flex justify-center shrink-0">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] md:h-6 md:w-6 md:text-xs ${
                      today ? "bg-gray-900 font-bold text-white" : isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {formatDayNumber(day)}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-px overflow-y-auto flex-1">
                    {dayEvents.map((event) => (
                      <button key={`${event.id}-${dayKey}`} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        className="flex w-full items-center gap-1 truncate rounded-sm px-0.5 py-px text-left text-[9px] hover:bg-gray-100 md:px-1 md:text-[10px]"
                        style={{
                          backgroundColor: `${event.color || "#737373"}15`,
                          borderLeft: `2px solid ${event.color || "#737373"}`,
                        }}>
                        <span className="truncate text-gray-900 pl-0.5">{event.title}</span>
                      </button>
                    ))}
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
