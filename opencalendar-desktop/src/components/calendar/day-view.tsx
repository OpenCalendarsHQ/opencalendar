import { useMemo, memo, useCallback, useState, useEffect } from "react";
import {
  formatWeekDay,
  formatDayNumber,
  isToday,
  getTimePosition,
  getEventHeight,
} from "../../lib/utils/date";
import { splitMultiDayTimedEvents, isEventOnDay } from "../../lib/utils/multi-day";
import { computeEventLayout } from "../../lib/utils/event-layout";
import type { CalendarEvent } from "../../lib/types";

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
  const today = isToday(currentDate);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!today) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [today]);

  // Timed events for this day (including clipped multi-day timed events)
  const dayEvents = useMemo(
    () => splitMultiDayTimedEvents(events, currentDate),
    [events, currentDate]
  );

  // All-day events for this day
  const allDayEvents = useMemo(
    () => events.filter((e) => e.isAllDay && isEventOnDay(e, currentDate)),
    [events, currentDate]
  );

  const layoutEvents = useMemo(() => computeEventLayout(dayEvents), [dayEvents]);

  const formatHour = useCallback((hour: number) => {
    return hour.toString().padStart(2, "0") + ":00";
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header with day */}
      <div
        className={`shrink-0 border-b border-border px-6 py-4 text-center ${
          today ? "bg-muted/30" : "bg-background"
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {formatWeekDay(currentDate)}
          </div>
          <div className="text-4xl font-black tracking-tighter text-foreground">
            {formatDayNumber(currentDate)}
          </div>
          <div className="text-sm font-medium text-muted-foreground mt-1">
            {currentDate.toLocaleDateString("nl-NL", {
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {/* All-day events banner */}
        {allDayEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {allDayEvents.map((event) => {
              const color = event.color || "#737373";
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-[10px] font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: `${color}15`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span className="truncate text-foreground max-w-[120px]">
                    {event.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Time grid - gelijk aan weekweergave: events absoluut gepositioneerd over uren heen */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour labels */}
          <div className="w-[60px] shrink-0 border-r border-border bg-muted/50">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative h-[60px] pr-2 text-right"
              >
                <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground">
                  {hour > 0 ? formatHour(hour) : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 ml-[60px]">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b border-border"
              />
            ))}
          </div>

          {/* Event column - absoluut gepositioneerd zoals weekweergave */}
          <div className="relative flex-1 ml-[60px] min-w-0">
            {/* Current time indicator */}
            {today && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                style={{
                  top: `${getTimePosition(now, HOUR_HEIGHT)}px`,
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            )}

            {layoutEvents.map((event) => {
              const top = getTimePosition(event.startTime, HOUR_HEIGHT);
              const height = Math.max(
                getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT),
                20
              );
              const color = event.color || "#737373";
              const columnWidth = 100 / event.totalColumns;
              const left = event.column * columnWidth;
              const width = columnWidth - (event.totalColumns > 1 ? 2 : 0);

              return (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className="absolute z-10 flex flex-col items-start justify-start overflow-hidden rounded-md p-1.5 text-left transition-all hover:z-20 hover:bg-opacity-90 hover:shadow-md active:scale-[0.98]"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: `${color}15`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span className="truncate text-[11px] font-medium leading-tight text-foreground pl-0.5 w-full">
                    {event.title}
                  </span>
                  {height > 35 && (
                    <span className="mt-0.5 text-[9px] font-medium text-muted-foreground pl-0.5">
                      {event.startTime.toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {event.endTime.toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
