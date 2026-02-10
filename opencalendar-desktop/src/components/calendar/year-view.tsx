import { useMemo, memo } from "react";
import { getMonthDays, formatWeekDay, formatDayNumber, isToday, isSameMonth, getWeekDays } from "../../lib/utils/date";
import { isEventOnDay, toDateKey } from "../../lib/utils/multi-day";
import type { CalendarEvent } from "../../lib/types";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  weekStartsOn?: 0 | 1;
}

interface MiniMonthProps {
  month: number;
  year: number;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  weekStartsOn: 0 | 1;
}

const MiniMonth = memo(function MiniMonth({
  month,
  year,
  events,
  onDayClick,
  weekStartsOn,
}: MiniMonthProps) {
  const monthDate = new Date(year, month, 1);
  const monthDays = useMemo(() => getMonthDays(monthDate, weekStartsOn), [monthDate, weekStartsOn]);
  const weekDayHeaders = useMemo(
    () => getWeekDays(new Date(), weekStartsOn).map((d) => formatWeekDay(d).charAt(0)),
    [weekStartsOn]
  );

  // Count events per day
  const eventCountsByDay = useMemo(() => {
    const map = new Map<string, number>();
    monthDays.forEach((day) => {
      const dayKey = toDateKey(day);
      const count = events.filter((e) => isEventOnDay(e, day)).length;
      if (count > 0) {
        map.set(dayKey, count);
      }
    });
    return map;
  }, [events, monthDays]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      result.push(monthDays.slice(i, i + 7));
    }
    return result;
  }, [monthDays]);

  const monthName = monthDate.toLocaleDateString('nl-NL', { month: 'long' });

  return (
    <div className="border border-gray-200 rounded-lg p-2 bg-white hover:shadow-md transition-shadow">
      <div className="text-center font-semibold text-sm text-gray-900 mb-2 capitalize">
        {monthName}
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDayHeaders.map((day, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-px">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const dayKey = toDateKey(day);
              const eventCount = eventCountsByDay.get(dayKey) || 0;
              const isCurrentMonth = isSameMonth(day, monthDate);
              const today = isToday(day);

              return (
                <button
                  key={dayKey}
                  onClick={() => onDayClick(day)}
                  className={`
                    aspect-square flex flex-col items-center justify-center text-[10px] rounded-sm
                    hover:bg-gray-100 transition-colors
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                    ${today ? 'bg-blue-600 text-white font-bold hover:bg-blue-700' : ''}
                  `}
                >
                  <span>{formatDayNumber(day)}</span>
                  {eventCount > 0 && (
                    <div className="flex gap-px mt-0.5">
                      {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            today ? 'bg-white' : 'bg-blue-500'
                          }`}
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
  onDayClick,
  weekStartsOn = 1,
}: YearViewProps) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">{year}</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {months.map((month) => (
          <MiniMonth
            key={month}
            month={month}
            year={year}
            events={events}
            onDayClick={onDayClick}
            weekStartsOn={weekStartsOn}
          />
        ))}
      </div>
    </div>
  );
});
