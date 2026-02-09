"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { HOURS, getHourLabel, isToday, getTimePosition } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";

const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;

interface DragState {
  columnIndex: number;
  startMinutes: number;
  currentMinutes: number;
}

interface TimeGridProps {
  children: React.ReactNode;
  columnCount: number;
  dates: Date[];
  onDragCreate?: (date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
}

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function minutesToPosition(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

function positionToMinutes(y: number): number {
  return (y / HOUR_HEIGHT) * 60;
}

export const TimeGrid = memo(function TimeGrid({ children, columnCount, dates, onDragCreate }: TimeGridProps) {
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number>(0);
  const hasTodayColumn = dates.some((d) => isToday(d));
  const todayIndex = dates.findIndex((d) => isToday(d));
  const use24h = settings.timeFormat === "24h";
  const [drag, setDrag] = useState<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);

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

  const getColumnAndMinutes = useCallback((e: React.MouseEvent | MouseEvent) => {
    const container = scrollRef.current;
    if (!container) return null;

    // Get the grid area (after the time gutter)
    const gridEl = container.querySelector('[data-grid-area]') as HTMLElement;
    if (!gridEl) return null;

    const rect = gridEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const colWidth = rect.width / columnCount;
    const columnIndex = Math.max(0, Math.min(columnCount - 1, Math.floor(x / colWidth)));
    const minutes = snapToGrid(Math.max(0, Math.min(24 * 60, positionToMinutes(y))));

    return { columnIndex, minutes };
  }, [columnCount]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left click, ignore if clicking on an event
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-event]')) return;
    if (!onDragCreate) return;

    const result = getColumnAndMinutes(e);
    if (!result) return;

    isDraggingRef.current = false;
    dragStartYRef.current = e.clientY;

    setDrag({
      columnIndex: result.columnIndex,
      startMinutes: result.minutes,
      currentMinutes: result.minutes + SNAP_MINUTES,
    });

    e.preventDefault();
  }, [getColumnAndMinutes, onDragCreate]);

  useEffect(() => {
    if (!drag) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Activate drag after 4px of movement
      if (!isDraggingRef.current) {
        if (Math.abs(e.clientY - dragStartYRef.current) < 4) return;
        isDraggingRef.current = true;
      }

      const container = scrollRef.current;
      if (!container) return;

      const gridEl = container.querySelector('[data-grid-area]') as HTMLElement;
      if (!gridEl) return;

      const rect = gridEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = snapToGrid(Math.max(0, Math.min(24 * 60, positionToMinutes(y))));

      setDrag((prev) => prev ? { ...prev, currentMinutes: minutes } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (drag && onDragCreate) {
        const wasRealDrag = isDraggingRef.current;
        const topMin = Math.min(drag.startMinutes, drag.currentMinutes);
        const botMin = Math.max(drag.startMinutes, drag.currentMinutes);

        // If it was just a click (not a real drag), create a 1-hour event
        const startMinutes = wasRealDrag ? topMin : topMin;
        const endMinutes = wasRealDrag ? (botMin > topMin ? botMin : topMin + SNAP_MINUTES) : topMin + 60;

        const clampedEnd = Math.min(endMinutes, 24 * 60);
        const date = dates[drag.columnIndex];

        if (date && clampedEnd > startMinutes) {
          const startHour = Math.floor(startMinutes / 60);
          const startMin = startMinutes % 60;
          const endHour = Math.floor(clampedEnd / 60);
          const endMin = clampedEnd % 60;
          onDragCreate(date, startHour, startMin, endHour, endMin);
        }
      }

      setDrag(null);
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag, dates, onDragCreate]);

  // Calculate drag preview position
  const dragPreview = drag && isDraggingRef.current ? (() => {
    const topMin = Math.min(drag.startMinutes, drag.currentMinutes);
    const botMin = Math.max(drag.startMinutes, drag.currentMinutes);
    const top = minutesToPosition(topMin);
    const height = Math.max(minutesToPosition(botMin - topMin), minutesToPosition(SNAP_MINUTES));
    const colWidth = 100 / columnCount;
    const left = drag.columnIndex * colWidth;

    const startH = Math.floor(topMin / 60);
    const startM = topMin % 60;
    const endH = Math.floor(botMin / 60);
    const endM = botMin % 60;
    const formatMin = (m: number) => String(m).padStart(2, "0");

    let label: string;
    if (use24h) {
      label = `${String(startH).padStart(2, "0")}:${formatMin(startM)} – ${String(endH).padStart(2, "0")}:${formatMin(endM)}`;
    } else {
      const fmtH = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const hh = h % 12 || 12;
        return `${hh}:${formatMin(startM)} ${period}`;
      };
      label = `${fmtH(startH)} – ${fmtH(endH)}`;
    }

    return { top, height, left: `${left}%`, width: `calc(${colWidth}% - 4px)`, label };
  })() : null;

  return (
    <div
      ref={scrollRef}
      data-scroll-container
      className="flex-1 overflow-y-auto overflow-x-hidden"
      style={{ willChange: "scroll-position" }}
    >
      <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
        {/* Hour lines */}
        {HOURS.map((hour) => (
          <div key={hour} className="absolute left-0 right-0 flex" style={{ top: hour * HOUR_HEIGHT }}>
            <div className="w-[36px] shrink-0 pr-1 text-right md:w-[52px] md:pr-2">
              <span className="relative -top-2 select-none text-[9px] text-muted-foreground md:text-[10px]">
                {hour > 0 ? getHourLabel(hour, use24h) : ""}
              </span>
            </div>
            <div className={`flex-1 border-t ${hour === 0 ? "border-transparent" : "border-border-light"}`} />
          </div>
        ))}

        {/* Column dividers */}
        <div className="absolute inset-0 ml-[36px] flex md:ml-[52px]">
          {Array.from({ length: columnCount }).map((_, i) => (
            <div key={i} className={`flex-1 ${i < columnCount - 1 ? "border-r border-border-light" : ""}`} />
          ))}
        </div>

        {/* Events container + drag target */}
        <div
          data-grid-area
          className="absolute inset-0 ml-[36px] flex md:ml-[52px]"
          onMouseDown={handleMouseDown}
          style={{ cursor: onDragCreate ? "crosshair" : undefined }}
        >
          {children}
        </div>

        {/* Drag preview overlay */}
        {dragPreview && (
          <div
            className="pointer-events-none absolute z-30 ml-[36px] md:ml-[52px]"
            style={{
              top: `${dragPreview.top}px`,
              height: `${dragPreview.height}px`,
              left: dragPreview.left,
              width: dragPreview.width,
              marginLeft: "2px",
            }}
          >
            <div className="h-full w-full rounded-[4px] border-2 border-accent/60 bg-accent/15 px-2 py-1">
              <span className="text-[11px] font-medium text-foreground/80 select-none">
                {dragPreview.label}
              </span>
            </div>
          </div>
        )}

        {/* Current time indicator */}
        {hasTodayColumn && (
          <div className="absolute z-20 flex items-center time-indicator-position"
            style={{
              top: currentTimeTop,
              left: todayIndex >= 0 ? `calc(var(--time-gutter) + ${(todayIndex / columnCount) * 100}%)` : "var(--time-gutter)",
              width: todayIndex >= 0 ? `calc(${(1 / columnCount) * 100}%)` : "calc(100% - var(--time-gutter))",
            }}>
            <div className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-current-time" />
            <div className="h-[1.5px] flex-1 bg-current-time" />
          </div>
        )}
      </div>
    </div>
  );
});

export { HOUR_HEIGHT };
