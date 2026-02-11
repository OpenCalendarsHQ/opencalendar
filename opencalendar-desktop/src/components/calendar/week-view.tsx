import { useMemo, memo, useCallback } from "react";
import {
  getWeekDays, formatWeekDay, formatDayNumber, isToday,
  getTimePosition, getEventHeight,
} from "../../lib/utils/date";
import { computeEventLayout } from "../../lib/utils/event-layout";
import {
  splitMultiDayTimedEvents,
  computeMultiDaySpans,
  isMultiDayEvent,
  toDateKey,
} from "../../lib/utils/multi-day";
import type { CalendarEvent } from "../../lib/types";

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  weekStartsOn?: 0 | 1;
}

const DayColumn = memo(function DayColumn({
  layoutEvents,
  onEventClick,
}: {
  dayKey: string;
  layoutEvents: ReturnType<typeof computeEventLayout>;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="relative flex-1 border-r border-gray-100 last:border-r-0">
      {layoutEvents.map((event) => {
        const top = getTimePosition(event.startTime, HOUR_HEIGHT);
        const height = Math.max(getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT), 20);
        
        // Calculate horizontal position for overlapping events
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
            className="absolute z-10 flex flex-col items-start justify-start overflow-hidden rounded-md border border-white/20 p-1.5 text-left transition-colors hover:z-20"
            style={{
              top: `${top}px`,
              height: `${height}px`,
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: event.color || "#737373",
              color: "white",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <span className="truncate text-[11px] font-semibold leading-tight">{event.title}</span>
            {height > 30 && (
              <span className="mt-0.5 text-[9px] opacity-90">
                {event.startTime.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export const WeekView = memo(function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  weekStartsOn = 1,
}: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);

  // Separate all-day + multi-day
  const { multiDaySpans, singleDayAllDay } = useMemo(() => {
    const allDayAndMultiDay = events.filter((e) => e.isAllDay || isMultiDayEvent(e));
    const spans = computeMultiDaySpans(allDayAndMultiDay, weekDays);

    const singleDay = new Map<string, CalendarEvent[]>();
    const multiDay = spans.filter((s) => s.span > 1);

    for (const s of spans) {
      if (s.span === 1) {
        const key = toDateKey(weekDays[s.startCol]);
        const arr = singleDay.get(key) || [];
        arr.push(s.event);
        singleDay.set(key, arr);
      }
    }

    return { multiDaySpans: multiDay, singleDayAllDay: singleDay };
  }, [events, weekDays]);

  // Compute timed event layout per day
  const layoutByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeEventLayout>>();
    weekDays.forEach((day) => {
      const dayKey = toDateKey(day);
      const dayEvents = splitMultiDayTimedEvents(events, day);
      map.set(dayKey, computeEventLayout(dayEvents));
    });
    return map;
  }, [weekDays, events]);

  const formatHour = useCallback((hour: number) => {
    return hour.toString().padStart(2, '0') + ':00';
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Day Headers */}
      <div className="shrink-0 border-b border-gray-200">
        <div className="flex">
          <div className="w-[60px] shrink-0" />
          {weekDays.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className="flex flex-1 flex-col items-center py-2 border-l border-gray-100 first:border-l-0 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onDayClick(day)}
              >
                <span className={`text-[10px] font-medium uppercase tracking-wider ${today ? "text-blue-600" : "text-gray-500"}`}>
                  {formatWeekDay(day)}
                </span>
                <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                  today ? "bg-blue-600 text-white" : "text-gray-900"
                }`}>
                  {formatDayNumber(day)}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-day / Multi-day banners */}
        {(multiDaySpans.length > 0 || Array.from(singleDayAllDay.values()).some(v => v.length > 0)) && (
          <div className="relative border-t border-gray-100 pb-1">
            <div className="flex">
              <div className="w-[60px] shrink-0" />
              <div className="relative flex-1 min-h-[24px]">
                {multiDaySpans.map((span, idx) => (
                  <button
                    key={`${span.event.id}-md`}
                    onClick={() => onEventClick(span.event)}
                    className="absolute h-5 items-center gap-1 truncate rounded bg-blue-500 px-2 text-left text-[10px] font-medium text-white hover:brightness-90 transition-all"
                    style={{
                      top: `${idx * 22}px`,
                      left: `${(span.startCol / 7) * 100}%`,
                      width: `${(span.span / 7) * 100}%`,
                      margin: "2px 0",
                      backgroundColor: span.event.color || "#3b82f6",
                    }}
                  >
                    <span className="truncate">{span.event.title}</span>
                  </button>
                ))}
                
                {/* Single day all-day events */}
                {weekDays.map((day, colIdx) => {
                  const dayKey = toDateKey(day);
                  const dayAllDay = singleDayAllDay.get(dayKey) || [];
                  const topOffset = multiDaySpans.length * 22;
                  
                  return (
                    <div
                      key={`${dayKey}-allday`}
                      className="absolute space-y-0.5 px-1"
                      style={{
                        left: `${(colIdx / 7) * 100}%`,
                        width: `${(1 / 7) * 100}%`,
                        top: `${topOffset}px`,
                      }}
                    >
                      {dayAllDay.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="flex w-full items-center gap-1.5 truncate rounded bg-gray-100 px-2 py-0.5 text-left text-[10px] font-medium text-gray-700 hover:bg-gray-200"
                        >
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: event.color || "#737373" }} />
                          <span className="truncate">{event.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Spacer for banner height */}
            <div style={{ height: (multiDaySpans.length * 22) + (Array.from(singleDayAllDay.values()).some(v => v.length > 0) ? 24 : 0) }} />
          </div>
        )}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour labels */}
          <div className="w-[60px] shrink-0 border-r border-gray-100 bg-gray-50/50">
            {HOURS.map((hour) => (
              <div key={hour} className="relative h-[60px] pr-2 text-right">
                <span className="absolute -top-2 right-2 text-[10px] text-gray-400">
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
                className="h-[60px] border-b border-gray-100"
              />
            ))}
          </div>

          {/* Day Columns */}
          <div className="flex flex-1 ml-[60px] relative">
            {weekDays.map((day) => {
              const dayKey = toDateKey(day);
              const layoutEvents = layoutByDay.get(dayKey) || [];
              return (
                <DayColumn
                  key={dayKey}
                  dayKey={dayKey}
                  layoutEvents={layoutEvents}
                  onEventClick={onEventClick}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
