"use client";

import { useEffect, useRef, useState } from "react";
import { HOURS, getHourLabel, isToday, getTimePosition } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";

const HOUR_HEIGHT = 60;

interface TimeGridProps {
  children: React.ReactNode;
  columnCount: number;
  dates: Date[];
}

export function TimeGrid({ children, columnCount, dates }: TimeGridProps) {
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number>(0);
  const hasTodayColumn = dates.some((d) => isToday(d));
  const todayIndex = dates.findIndex((d) => isToday(d));
  const use24h = settings.timeFormat === "24h";

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const scrollTo = getTimePosition(now, HOUR_HEIGHT) - 200;
      scrollRef.current.scrollTop = Math.max(0, scrollTo);
    }
  }, []);

  useEffect(() => {
    const updateTime = () => setCurrentTimeTop(getTimePosition(new Date(), HOUR_HEIGHT));
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
        {/* Hour lines */}
        {HOURS.map((hour) => (
          <div key={hour} className="absolute left-0 right-0 flex" style={{ top: hour * HOUR_HEIGHT }}>
            <div className="w-[52px] shrink-0 pr-2 text-right">
              <span className="relative -top-2 select-none text-[10px] text-muted-foreground">
                {hour > 0 ? getHourLabel(hour, use24h) : ""}
              </span>
            </div>
            <div className={`flex-1 border-t ${hour === 0 ? "border-transparent" : "border-border-light"}`} />
          </div>
        ))}

        {/* Column dividers */}
        <div className="absolute inset-0 ml-[52px] flex">
          {Array.from({ length: columnCount }).map((_, i) => (
            <div key={i} className={`flex-1 ${i < columnCount - 1 ? "border-r border-border-light" : ""}`} />
          ))}
        </div>

        {/* Events container */}
        <div className="absolute inset-0 ml-[52px] flex">{children}</div>

        {/* Current time indicator */}
        {hasTodayColumn && (
          <div className="absolute z-20 flex items-center"
            style={{
              top: currentTimeTop,
              left: todayIndex >= 0 ? `calc(52px + ${(todayIndex / columnCount) * 100}%)` : "52px",
              width: todayIndex >= 0 ? `calc(${(1 / columnCount) * 100}%)` : "calc(100% - 52px)",
            }}>
            <div className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-current-time" />
            <div className="h-[1.5px] flex-1 bg-current-time" />
          </div>
        )}
      </div>
    </div>
  );
}

export { HOUR_HEIGHT };
