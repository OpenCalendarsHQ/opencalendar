import { useMemo, memo, useCallback, useState, useEffect, useRef } from "react";
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
const DEFAULT_SCROLL_HOUR = 8; // Start bij werkuren (8:00)

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
    <div className="relative flex-1 border-r border-border last:border-r-0">
      {layoutEvents.map((event) => {
        const top = getTimePosition(event.startTime, HOUR_HEIGHT);
        const height = Math.max(getEventHeight(event.startTime, event.endTime, HOUR_HEIGHT), 20);
        
        // Calculate horizontal position for overlapping events
        const columnWidth = 100 / event.totalColumns;
        const left = event.column * columnWidth;
        const width = columnWidth - (event.totalColumns > 1 ? 2 : 0);

        const color = event.color || "#737373";
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
            <span className="truncate text-[11px] font-medium leading-tight text-foreground pl-0.5">{event.title}</span>
            {height > 35 && (
              <span className="mt-0.5 text-[9px] font-medium text-muted-foreground pl-0.5">
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
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Standaard scrollen naar werkuren (8:00) in plaats van 00:00
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = DEFAULT_SCROLL_HOUR * HOUR_HEIGHT;
    }
  }, [currentDate]);

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
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Day Headers - grid met exacte kolommen voor alignment */}
      <div className="shrink-0 border-b border-border">
        <div
          className="grid min-w-0"
          style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}
        >
          <div className="w-[60px] shrink-0" />
          {weekDays.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col items-center py-3 border-l border-border first:border-l-0 cursor-pointer hover:bg-muted/50 transition-colors min-w-0 ${
                  today ? "bg-muted/30" : ""
                }`}
                onClick={() => onDayClick(day)}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest ${today ? "text-foreground" : "text-muted-foreground"}`}>
                  {formatWeekDay(day)}
                </span>
                <span className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold transition-all ${
                  today ? "bg-accent text-accent-foreground shadow-sm" : "text-foreground hover:bg-muted"
                }`}>
                  {formatDayNumber(day)}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-day / Multi-day banners */}
        {(multiDaySpans.length > 0 || Array.from(singleDayAllDay.values()).some(v => v.length > 0)) && (
          <div className="relative border-t border-border pb-1">
            <div
              className="grid min-w-0"
              style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}
            >
              <div className="w-[60px] shrink-0" />
              <div className="relative col-span-7 min-h-[24px] min-w-0">
                {multiDaySpans.map((span, idx) => {
                  const color = span.event.color || "#3b82f6";
                  return (
                    <button
                      key={`${span.event.id}-md`}
                      onClick={() => onEventClick(span.event)}
                      className="absolute h-5 items-center gap-1 truncate rounded px-2 text-left text-[10px] font-medium transition-all hover:opacity-90"
                      style={{
                        top: `${idx * 22}px`,
                        left: `${(span.startCol / 7) * 100}%`,
                        width: `${(span.span / 7) * 100}%`,
                        margin: "2px 0",
                        backgroundColor: `${color}15`,
                        borderLeft: `3px solid ${color}`,
                        color: "inherit",
                      }}
                    >
                      <span className="truncate text-foreground pl-0.5">{span.event.title}</span>
                    </button>
                  );
                })}
                
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
                      {dayAllDay.map((event) => {
                        const color = event.color || "#737373";
                        return (
                          <button
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="flex w-full items-center gap-1.5 truncate rounded px-2 py-0.5 text-left text-[10px] font-medium transition-all hover:opacity-90"
                            style={{
                              backgroundColor: `${color}15`,
                              borderLeft: `3px solid ${color}`,
                            }}
                          >
                            <span className="truncate text-foreground pl-0.5">{event.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ height: (multiDaySpans.length * 22) + (Array.from(singleDayAllDay.values()).some(v => v.length > 0) ? 24 : 0) }} />
          </div>
        )}
      </div>

      {/* Time Grid - scrollbar-gutter: stable houdt header en grid uitgelijnd */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto scrollbar-thin min-h-0"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          className="grid min-w-0"
          style={{
            gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
            gridTemplateRows: `repeat(24, ${HOUR_HEIGHT}px)`,
            height: 24 * HOUR_HEIGHT,
          }}
        >
          {/* Hour labels - kolom 1, alle rijen */}
          <div
            className="w-[60px] shrink-0 border-r border-border bg-muted/50"
            style={{ gridColumn: 1, gridRow: "1 / -1", display: "flex", flexDirection: "column" }}
          >
            {HOURS.map((hour) => (
              <div key={hour} className="relative flex-shrink-0 pr-2 text-right" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground">
                  {hour > 0 ? formatHour(hour) : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Grid lines overlay */}
          <div
            className="col-span-7 relative pointer-events-none"
            style={{ gridColumn: "2 / -1", gridRow: "1 / -1" }}
          >
            {HOURS.map((hour) => (
              <div key={hour} className="h-[60px] border-b border-border" />
            ))}
          </div>

          {/* Day Columns - kolommen 2-8, alle rijen */}
          {weekDays.map((day, i) => {
            const dayKey = toDateKey(day);
            const layoutEvents = layoutByDay.get(dayKey) || [];
            return (
              <div
                key={dayKey}
                className="relative min-w-0 border-r border-border last:border-r-0"
                style={{ gridColumn: i + 2, gridRow: "1 / -1" }}
              >
                <DayColumn
                  dayKey={dayKey}
                  layoutEvents={layoutEvents}
                  onEventClick={onEventClick}
                />
              </div>
            );
          })}
        </div>

        {/* Current time indicator */}
        {weekDays.some(d => isToday(d)) && (
          <div
            className="pointer-events-none absolute z-30 flex items-center"
            style={{
              left: "60px",
              right: 0,
              top: `${getTimePosition(now, HOUR_HEIGHT)}px`,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
            <div className="flex-1 h-px bg-red-500" />
          </div>
        )}
      </div>
    </div>
  );
});
