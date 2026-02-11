"use client";

import { memo } from "react";
import { getWeekDays, formatWeekDay, formatDayNumber, isToday, getWeekNumber } from "@/lib/utils/date";
import { toDateKey } from "@/lib/utils/multi-day";
import { TimeGrid, HOUR_HEIGHT } from "./time-grid";

interface WeekViewSkeletonProps {
  currentDate: Date;
  weekStartsOn: 0 | 1;
  showWeekNumbers: boolean;
}

export const WeekViewSkeleton = memo(function WeekViewSkeleton({
  currentDate,
  weekStartsOn,
  showWeekNumbers,
}: WeekViewSkeletonProps) {
  const weekDays = getWeekDays(currentDate, weekStartsOn);
  const weekNumber = showWeekNumbers ? getWeekNumber(currentDate, weekStartsOn) : null;

  return (
    <div className="flex h-full flex-col animate-pulse">
      {/* Header */}
      <div className="shrink-0 border-b border-border">
        <div className="flex">
          <div className="flex w-[36px] shrink-0 items-end justify-center pb-1 md:w-[52px]">
            {weekNumber !== null && (
              <span className="text-[9px] font-medium text-muted-foreground">W{weekNumber}</span>
            )}
          </div>
          {weekDays.map((day) => {
            const today = isToday(day);
            const dayKey = toDateKey(day);

            return (
              <div key={dayKey} className="flex flex-1 flex-col items-center border-l border-border-light py-1.5">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${today ? "text-foreground" : "text-muted-foreground"}`}>
                  {formatWeekDay(day)}
                </span>
                <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md font-pixel text-sm ${
                  today ? "bg-foreground font-bold text-background" : "text-foreground"
                }`}>
                  {formatDayNumber(day)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Grid with skeleton events */}
      <TimeGrid columnCount={7} dates={weekDays}>
        {weekDays.map((day, dayIndex) => {
          const dayKey = toDateKey(day);
          // Fixed positions to prevent hydration mismatch (no Math.random!)
          const skeletonEvents = [
            { top: (dayIndex * 2 + 3) * HOUR_HEIGHT, height: HOUR_HEIGHT * 1.5 },
            { top: (dayIndex * 2 + 6) * HOUR_HEIGHT, height: HOUR_HEIGHT * 2 },
            { top: (dayIndex * 2 + 10) * HOUR_HEIGHT, height: HOUR_HEIGHT * 1.2 },
          ];
          
          return (
            <div key={dayKey} className="relative flex-1">
              {skeletonEvents.map((event, i) => (
                <div
                  key={i}
                  className="absolute inset-x-1 rounded-md bg-muted animate-pulse"
                  style={{
                    top: `${event.top}px`,
                    height: `${event.height}px`,
                    left: "2px",
                    right: "2px",
                  }}
                >
                  <div className="h-full w-full rounded-md bg-gradient-to-br from-muted to-muted/50" />
                </div>
              ))}
            </div>
          );
        })}
      </TimeGrid>

      {/* Loading overlay with logo */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {/* OpenCalendar Logo */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-pulse"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
              />
              <line
                x1="3"
                y1="9"
                x2="21"
                y2="9"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
              />
              <line
                x1="8"
                y1="2"
                x2="8"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-foreground"
              />
              <line
                x1="16"
                y1="2"
                x2="16"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-foreground"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground">Events laden...</span>
        </div>
      </div>
    </div>
  );
});
