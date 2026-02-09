"use client";

import { formatTime } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { MapPin } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import type { LayoutEvent } from "@/lib/utils/event-layout";
import { EventHoverCard } from "./event-hover-card";

interface EventCardProps {
  event: LayoutEvent;
  style: React.CSSProperties;
  onClick: (event: CalendarEvent) => void;
}

export function EventCard({ event, style, onClick }: EventCardProps) {
  const { settings } = useSettings();
  const use24h = settings.timeFormat === "24h";
  const duration =
    (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
  const isCompact = duration <= 30;

  // Calculate horizontal position for overlapping events
  const columnWidth = 100 / event.totalColumns;
  const left = event.column * columnWidth;
  const width = columnWidth + (event.totalColumns > 1 ? 0.5 : 0);

  return (
    <EventHoverCard event={event}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick(event);
        }}
        className="absolute z-10 flex cursor-pointer flex-col justify-start overflow-hidden rounded-[4px] border border-border/50 bg-card px-2 py-1 text-left hover:z-20 hover:bg-card-hover"
        style={{
          ...style,
          left: `${left}%`,
          width: `calc(${width}% - 4px)`,
          marginLeft: "2px",
        }}
      >
        <div className="absolute left-0 top-0 h-full w-[2px]" style={{ backgroundColor: event.color || "#737373" }} />

        {isCompact ? (
          <div className="flex items-start gap-1.5 truncate pl-1">
            <span className="text-[11px] font-medium leading-tight text-foreground">{event.title}</span>
            <span className="shrink-0 text-[10px] leading-tight text-muted-foreground">{formatTime(event.startTime, use24h)}</span>
          </div>
        ) : (
          <div className="pl-1">
            <div className="truncate text-[11px] font-medium leading-tight text-foreground">{event.title}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              {formatTime(event.startTime, use24h)} – {formatTime(event.endTime, use24h)}
            </div>
            {event.location && duration > 60 && event.totalColumns <= 2 && (
              <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        )}
      </button>
    </EventHoverCard>
  );
}

/** Multi-day event banner shown in all-day / header section */
interface MultiDayEventCardProps {
  event: CalendarEvent;
  span: number; // number of day columns this event spans
  startCol: number; // 0-based column index where it starts
  totalCols: number; // total columns in view
  onClick: (event: CalendarEvent) => void;
}

export function MultiDayEventCard({ event, span, startCol, totalCols, onClick }: MultiDayEventCardProps) {
  const widthPercent = (span / totalCols) * 100;
  const leftPercent = (startCol / totalCols) * 100;

  return (
    <EventHoverCard event={event}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick(event);
        }}
        className="absolute z-10 flex items-center gap-1 truncate rounded-[4px] border border-border/50 bg-card px-2 py-0.5 text-left text-[10px] font-medium text-foreground hover:bg-card-hover"
        style={{
          left: `${leftPercent}%`,
          width: `calc(${widthPercent}% - 4px)`,
          marginLeft: "2px",
        }}
      >
        <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: event.color || "#737373" }} />
        <span className="truncate">{event.title}</span>
      </button>
    </EventHoverCard>
  );
}

interface AllDayEventCardProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}

export function AllDayEventCard({ event, onClick }: AllDayEventCardProps) {
  return (
    <EventHoverCard event={event}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick(event);
        }}
        className="flex w-full items-center gap-1.5 truncate rounded-[4px] border border-border/50 bg-card px-2 py-0.5 text-left text-[10px] font-medium text-foreground hover:bg-card-hover"
      >
        <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: event.color || "#737373" }} />
        {event.title}
      </button>
    </EventHoverCard>
  );
}

export type { CalendarEvent };
