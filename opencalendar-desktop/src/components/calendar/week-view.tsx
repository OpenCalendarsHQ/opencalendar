import { useMemo, memo } from "react";
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

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Group events by day and hour
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

  const formatHour = (hour: number) => {
    return hour.toString().padStart(2, '0') + ':00';
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with days */}
      <div className="grid shrink-0 border-b border-gray-200" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div className="border-r border-gray-100"></div>
        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`border-r border-gray-100 px-2 py-2 text-center last:border-r-0 cursor-pointer hover:bg-gray-50 ${
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

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          {hours.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              {/* Hour label */}
              <div className="border-b border-r border-gray-100 px-2 py-1 text-right text-[10px] text-gray-600 bg-gray-50">
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
                    className="min-h-[60px] border-b border-r border-gray-100 p-1 last:border-r-0 hover:bg-gray-50 cursor-pointer relative"
                    onClick={() => {
                      const clickedTime = new Date(day);
                      clickedTime.setHours(hour, 0, 0, 0);
                      onDayClick(clickedTime);
                    }}
                  >
                    {hourEvents.map((event) => {
                      const eventStart = new Date(event.startTime);
                      const eventEnd = new Date(event.endTime);
                      const startHour = eventStart.getHours();
                      const endHour = eventEnd.getHours();
                      const isFirstHour = hour === startHour;

                      if (!isFirstHour) return null; // Only render on first hour

                      // Calculate height based on duration
                      const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
                      const height = Math.max(durationHours * 60, 20); // minimum 20px

                      return (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className="absolute left-1 right-1 rounded px-1 py-0.5 text-left text-[10px] hover:brightness-90 overflow-hidden"
                          style={{
                            backgroundColor: event.color || '#737373',
                            color: 'white',
                            height: `${height}px`,
                            top: '4px',
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-[9px] opacity-90">
                            {eventStart.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      );
                    })}
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
