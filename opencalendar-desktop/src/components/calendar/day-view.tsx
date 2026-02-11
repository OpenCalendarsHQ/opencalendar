import { useMemo, memo, useCallback } from "react";
import { formatWeekDay, formatDayNumber, isToday } from "../../lib/utils/date";
import type { CalendarEvent } from "../../lib/types";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const DayView = memo(function DayView({
  currentDate,
  events,
  onEventClick,
}: DayViewProps) {
  // Generate hours (6-23 for better performance)
  const hours = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 6), []);

  // Group events by hour - optimized
  const eventsByHour = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();

    hours.forEach((hour) => {
      const hourStart = new Date(currentDate);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(currentDate);
      hourEnd.setHours(hour, 59, 59, 999);

      const hourEvents = events.filter((event) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);

        // Event overlaps with this hour
        return eventStart < hourEnd && eventEnd > hourStart;
      });

      if (hourEvents.length > 0) {
        map.set(hour, hourEvents);
      }
    });

    return map;
  }, [events, currentDate, hours]);

  const formatHour = useCallback((hour: number) => {
    return hour.toString().padStart(2, '0') + ':00';
  }, []);

  const today = isToday(currentDate);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with day */}
      <div className={`shrink-0 border-b border-gray-200 px-4 py-3 text-center ${
        today ? 'bg-blue-50' : ''
      }`}>
        <div className="text-sm font-medium uppercase tracking-wider text-gray-600">
          {formatWeekDay(currentDate)}
        </div>
        <div className={`text-3xl font-bold ${today ? 'text-blue-600' : 'text-gray-900'}`}>
          {formatDayNumber(currentDate)}
        </div>
        <div className="text-sm text-gray-600">
          {currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Time grid - smooth scrolling */}
      <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour) || [];

            return (
              <div key={`hour-${hour}`} className="contents">
                {/* Hour label */}
                <div className="border-b border-r border-gray-100 px-4 py-3 text-right text-sm text-gray-600 bg-gray-50 sticky left-0">
                  {formatHour(hour)}
                </div>

                {/* Event container */}
                <div className="min-h-[80px] border-b border-gray-100 p-2 hover:bg-gray-50 relative transition-colors">
                  <div className="flex flex-col gap-1">
                    {hourEvents.map((event) => {
                      const eventStart = new Date(event.startTime);
                      const eventEnd = new Date(event.endTime);
                      const startHour = eventStart.getHours();
                      const isFirstHour = hour === startHour;

                      if (!isFirstHour) return null; // Only render on first hour

                      // Calculate height based on duration
                      const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
                      const height = Math.max(durationHours * 80, 28); // minimum 28px

                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="w-full rounded-md px-3 py-2 text-left hover:brightness-90 overflow-hidden shadow-sm transition-all hover:shadow-md"
                          style={{
                            backgroundColor: event.color || '#737373',
                            color: 'white',
                            height: `${height}px`,
                          }}
                        >
                          <div className="font-semibold truncate leading-tight text-sm">
                            {event.title}
                          </div>
                          <div className="text-xs opacity-90 mt-1">
                            {eventStart.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {eventEnd.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {event.location && (
                            <div className="text-xs opacity-80 truncate mt-1">
                              📍 {event.location}
                            </div>
                          )}
                          {event.description && (
                            <div className="text-xs opacity-75 truncate mt-1">
                              {event.description}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
