import { useMemo, memo } from "react";
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
  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Group events by hour
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

  const formatHour = (hour: number) => {
    return hour.toString().padStart(2, '0') + ':00';
  };

  const today = isToday(currentDate);

  return (
    <div className="flex h-full flex-col">
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

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour) || [];

            return (
              <div key={`hour-${hour}`} className="contents">
                {/* Hour label */}
                <div className="border-b border-r border-gray-100 px-4 py-2 text-right text-sm text-gray-600 bg-gray-50">
                  {formatHour(hour)}
                </div>

                {/* Hour content */}
                <div className="min-h-[80px] border-b border-gray-100 p-2 hover:bg-gray-50 cursor-pointer relative">
                  {hourEvents.map((event) => {
                    const eventStart = new Date(event.startTime);
                    const eventEnd = new Date(event.endTime);
                    const startHour = eventStart.getHours();
                    const isFirstHour = hour === startHour;

                    if (!isFirstHour) return null; // Only render on first hour

                    // Calculate height based on duration
                    const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
                    const height = Math.max(durationHours * 80, 30); // minimum 30px

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="absolute left-2 right-2 rounded-md px-3 py-2 text-left hover:brightness-90 shadow-sm"
                        style={{
                          backgroundColor: event.color || '#737373',
                          color: 'white',
                          height: `${height}px`,
                          top: '8px',
                        }}
                      >
                        <div className="font-semibold text-sm mb-1">{event.title}</div>
                        <div className="text-xs opacity-90">
                          {eventStart.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {eventEnd.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-90 mt-1 truncate">
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
      </div>
    </div>
  );
});
