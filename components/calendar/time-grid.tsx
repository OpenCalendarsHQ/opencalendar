"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { HOURS, getHourLabel, isToday, getTimePosition } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { useDrag } from "@/lib/drag-context";
import { EVENT_DRAG_TYPE, parseEventFromDragData, type SerializedEvent } from "@/lib/utils/event-drag";

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
  onTaskDrop?: (task: any, date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
  onEventDrop?: (event: SerializedEvent, date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
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

export const TimeGrid = memo(function TimeGrid({ children, columnCount, dates, onDragCreate, onTaskDrop, onEventDrop }: TimeGridProps) {
  const { settings } = useSettings();
  const { draggingTask, draggingEventDuration } = useDrag();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number>(0);
  const hasTodayColumn = dates.some((d) => isToday(d));
  const todayIndex = dates.findIndex((d) => isToday(d));
  const use24h = settings.timeFormat === "24h";
  const [drag, setDrag] = useState<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const [taskDragOver, setTaskDragOver] = useState<{ columnIndex: number; minutes: number } | null>(null);

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

  // Task and event drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!onTaskDrop && !onEventDrop) return;
    if (!draggingTask && !e.dataTransfer.types.includes(EVENT_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const result = getColumnAndMinutes(e as any);
    if (result) {
      setTaskDragOver(result);
    }
  }, [getColumnAndMinutes, onTaskDrop, onEventDrop, draggingTask]);

  const handleDragLeave = useCallback(() => {
    setTaskDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setTaskDragOver(null);

    const result = getColumnAndMinutes(e as any);
    if (!result) return;

    const date = dates[result.columnIndex];
    const startMinutes = result.minutes;
    const startHour = Math.floor(startMinutes / 60);
    const startMin = startMinutes % 60;

    // Event drop
    if (e.dataTransfer.types.includes(EVENT_DRAG_TYPE) && onEventDrop) {
      const data = e.dataTransfer.getData(EVENT_DRAG_TYPE);
      const event = parseEventFromDragData(data);
      if (event) {
        let endHour: number;
        let endMin: number;
        if (event.isAllDay) {
          const endMinutes = Math.min(startMinutes + 60, 24 * 60);
          endHour = Math.floor(endMinutes / 60);
          endMin = endMinutes % 60;
        } else {
          const origStart = new Date(event.startTime).getTime();
          const origEnd = new Date(event.endTime).getTime();
          const durationMs = origEnd - origStart;
          const newStart = new Date(date);
          newStart.setHours(startHour, startMin, 0, 0);
          const newEnd = new Date(newStart.getTime() + durationMs);
          endHour = newEnd.getHours();
          endMin = newEnd.getMinutes();
        }
        onEventDrop(event, date, startHour, startMin, endHour, endMin);
      }
      return;
    }

    // Task drop
    if (onTaskDrop && draggingTask) {
      try {
        const endMinutes = startMinutes + 60;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        onTaskDrop(draggingTask, date, startHour, startMin, endHour, endMin);
      } catch (error) {
        console.error("Failed to handle task drop:", error);
      }
    }
  }, [getColumnAndMinutes, dates, onTaskDrop, onEventDrop, draggingTask]);

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

    return { top, height, left: `${left}%`, width: `calc(${colWidth}% - 8px)`, label, marginLeft: "4px" };
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
              <span className="relative -top-2 select-none font-pixel text-[9px] text-muted-foreground md:text-[10px]">
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ cursor: onDragCreate ? "crosshair" : undefined }}
        >
          {children}

          {/* Drag preview overlay */}
          {dragPreview && (
            <div
              className="pointer-events-none absolute z-30"
              style={{
                top: `${dragPreview.top}px`,
                height: `${dragPreview.height}px`,
                left: dragPreview.left,
                width: dragPreview.width,
                marginLeft: dragPreview.marginLeft,
              }}
            >
              <div className="h-full w-full rounded-[4px] border-2 border-accent/60 bg-accent/15 px-2 py-1">
                <span className="text-[11px] font-medium text-foreground/80 select-none">
                  {dragPreview.label}
                </span>
              </div>
            </div>
          )}

          {/* Task/event drop indicator */}
          {taskDragOver && (
            <div
              className="pointer-events-none absolute z-30"
              style={{
                top: `${minutesToPosition(taskDragOver.minutes)}px`,
                height: `${minutesToPosition(draggingEventDuration ?? 60)}px`,
                left: `${(taskDragOver.columnIndex / columnCount) * 100}%`,
                width: `calc(${(1 / columnCount) * 100}% - 8px)`,
                marginLeft: "4px",
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-[4px] border-2 border-dashed border-accent/80 bg-accent/10 px-2 py-1">
                <span className="select-none text-[11px] font-medium text-foreground/80">
                  Hier plaatsen
                </span>
              </div>
            </div>
          )}

          {/* Current time indicator */}
          {hasTodayColumn && (
            <div
              className="absolute z-20 flex items-center pointer-events-none"
              style={{
                top: currentTimeTop,
                left: todayIndex >= 0 ? `${(todayIndex / columnCount) * 100}%` : "0",
                width: todayIndex >= 0 ? `${(1 / columnCount) * 100}%` : "100%",
              }}
            >
              <div className="h-3 w-3 -translate-x-[5px] rounded-full bg-red-500 shadow-sm z-10" />
              <div className="h-[2px] w-full bg-red-500 shadow-sm -ml-1.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export { HOUR_HEIGHT };
