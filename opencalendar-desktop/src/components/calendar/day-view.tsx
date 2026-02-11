import { useMemo, memo, useCallback, useState, useEffect } from "react";
import { formatWeekDay, formatDayNumber, isToday } from "../../lib/utils/date";
import type { CalendarEvent } from "../../lib/types";

const HOUR_HEIGHT = 100;


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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!today) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [today]);

  return (

    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with day */}
      <div className={`shrink-0 border-b border-gray-200 px-6 py-6 text-center ${
        today ? 'bg-blue-50/50' : 'bg-white'
      }`}>
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            {formatWeekDay(currentDate)}
          </div>
          <div className={`text-5xl font-black tracking-tighter ${today ? 'text-blue-600' : 'text-gray-900'}`}>
            {formatDayNumber(currentDate)}
          </div>
          <div className="text-sm font-medium text-gray-500 mt-1">
            {currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Time grid - smooth scrolling */}
      <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="grid relative" style={{ gridTemplateColumns: '100px 1fr' }}>
          {/* Current time indicator */}
          {today && now.getHours() >= 6 && (
            <div 
              className="absolute left-[100px] right-0 z-30 pointer-events-none flex items-center"
              style={{ 
                top: `${(now.getHours() - 6) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT}px`,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-px bg-red-500" />
            </div>
          )}
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour) || [];

            return (
              <div key={`hour-${hour}`} className="contents group">
                {/* Hour label */}
                <div className="border-b border-r border-gray-50 px-6 py-4 text-right text-xs font-bold text-gray-400 bg-white sticky left-0 group-hover:bg-gray-50 transition-colors">
                  {formatHour(hour)}
                </div>

                {/* Event container */}
                <div className="min-h-[100px] border-b border-gray-50 p-3 hover:bg-gray-50/50 relative transition-colors">
                  <div className="flex flex-col gap-2">
                    {hourEvents.map((event) => {
                      const eventStart = new Date(event.startTime);
                      const eventEnd = new Date(event.endTime);
                      const startHour = eventStart.getHours();
                      const isFirstHour = hour === startHour;

                      if (!isFirstHour) return null;

                      const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
                      const height = Math.max(durationHours * HOUR_HEIGHT - 12, 40); 

                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="w-full rounded-xl px-4 py-3 text-left hover:brightness-95 overflow-hidden shadow-sm transition-all hover:shadow-md active:scale-[0.99] border border-black/5"
                          style={{
                            backgroundColor: event.color || '#737373',
                            color: 'white',
                            height: `${height}px`,
                          }}
                        >
                          <div className="flex flex-col h-full">
                            <div className="font-bold truncate leading-tight text-base mb-1">
                              {event.title}
                            </div>
                            <div className="text-[11px] font-semibold opacity-90 flex items-center gap-1.5">
                              <span className="bg-white/20 px-1.5 py-0.5 rounded">
                                {eventStart.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {eventEnd.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {height > 80 && (
                              <div className="mt-auto space-y-1">
                                {event.location && (
                                  <div className="text-xs opacity-90 truncate flex items-center gap-1">
                                    <span className="opacity-70">📍</span> {event.location}
                                  </div>
                                )}
                                {event.description && (
                                  <div className="text-xs opacity-80 truncate italic">
                                    {event.description}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
