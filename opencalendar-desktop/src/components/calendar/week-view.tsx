import { useMemo, memo, useCallback } from "react";
import { getWeekDays, formatWeekDay, formatDayNumber, isToday } from "../../lib/utils/date";
import type { CalendarEvent } from "../../lib/types";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  weekStartsOn?: 0 | 1;
}

export const WeekView = memo(function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  weekStartsOn = 1,
}: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);

  // Generate hours (6-23 for better performance - working hours focus)
  const hours = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 6), []);

  // Group events by day and hour - optimized
  const eventsByDayAndHour = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    weekDays.forEach((day) => {
      const dayKey = day.toISOString().split('T')[0];

      hours.forEach((hour) => {
        const key = `${dayKey}-${hour}`;
        const hourStart = new Date(day);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(day);
        hourEnd.setHours(hour, 59, 59, 999);

        const hourEvents = events.filter((event) => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);

          // Event overlaps with this hour
          return eventStart < hourEnd && eventEnd > hourStart;
        });

        if (hourEvents.length > 0) {
          map.set(key, hourEvents);
        }
      });
    });

    return map;
  }, [events, weekDays, hours]);

  const formatHour = useCallback((hour: number) => {
    return hour.toString().padStart(2, '0') + ':00';
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with days - horizontally scrollable */}
      <div className="shrink-0 border-b border-gray-200 overflow-x-auto scrollbar-thin">
        <div className="grid min-w-max" style={{ gridTemplateColumns: '70px repeat(7, minmax(150px, 1fr))' }}>
          <div className="border-r border-gray-100 sticky left-0 bg-white z-10"></div>
          {weekDays.map((day, i) => {
            const today = isToday(day);
            return (
              <div
                key={i}
                className={`border-r border-gray-100 px-3 py-2 text-center last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                  today ? 'bg-blue-50' : ''
                }`}
                onClick={() => onDayClick(day)}
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-gray-600">
                  {formatWeekDay(day)}
                </div>
                <div className={`text-lg font-semibold ${today ? 'text-blue-600' : 'text-gray-900'}`}>
                  {formatDayNumber(day)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid - both directions scrollable */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="grid min-w-max" style={{ gridTemplateColumns: '70px repeat(7, minmax(150px, 1fr))' }}>
          {hours.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              {/* Hour label - sticky */}
              <div className="border-b border-r border-gray-100 px-3 py-2 text-right text-xs text-gray-600 bg-gray-50 sticky left-0 z-10">
                {formatHour(hour)}
              </div>

              {/* Day cells for this hour */}
              {weekDays.map((day, dayIndex) => {
                const dayKey = day.toISOString().split('T')[0];
                const key = `${dayKey}-${hour}`;
                const hourEvents = eventsByDayAndHour.get(key) || [];

                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="min-h-[70px] border-b border-r border-gray-100 p-1 last:border-r-0 hover:bg-gray-50 cursor-pointer relative transition-colors"
                    onClick={() => {
                      const clickedTime = new Date(day);
                      clickedTime.setHours(hour, 0, 0, 0);
                      onDayClick(clickedTime);
                    }}
                  >
                    <div className="flex flex-wrap gap-0.5">
                      {hourEvents.map((event) => {
                        const eventStart = new Date(event.startTime);
                        const eventEnd = new Date(event.endTime);
                        const startHour = eventStart.getHours();
                        const isFirstHour = hour === startHour;

                        if (!isFirstHour) return null; // Only render on first hour

                        // Calculate height based on duration
                        const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
                        const height = Math.max(durationHours * 70, 24); // minimum 24px

                        return (
                          <button
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            className="absolute left-1 right-1 rounded px-2 py-1 text-left text-xs hover:brightness-90 overflow-hidden shadow-sm transition-all hover:shadow-md"
                            style={{
                              backgroundColor: event.color || '#737373',
                              color: 'white',
                              height: `${height}px`,
                              top: '4px',
                            }}
                          >
                            <div className="font-medium truncate leading-tight">{event.title}</div>
                            <div className="text-[10px] opacity-90 mt-0.5">
                              {eventStart.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.location && (
                              <div className="text-[9px] opacity-80 truncate mt-0.5">
                                📍 {event.location}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
