"use client";

import { formatTime } from "@/lib/utils/date";
import { MapPin } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  style: React.CSSProperties;
  onClick: (event: CalendarEvent) => void;
}

export function EventCard({ event, style, onClick }: EventCardProps) {
  const duration =
    (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
  const isCompact = duration <= 30;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className="absolute left-0.5 right-1 z-10 cursor-pointer overflow-hidden rounded-[4px] border border-border/50 bg-card px-2 py-1 text-left hover:bg-card-hover"
      style={style}
    >
      <div className="absolute left-0 top-0 h-full w-[2px]" style={{ backgroundColor: event.color || "#737373" }} />

      {isCompact ? (
        <div className="flex items-center gap-1.5 truncate pl-1">
          <span className="text-[11px] font-medium text-foreground">{event.title}</span>
          <span className="text-[10px] text-muted-foreground">{formatTime(event.startTime)}</span>
        </div>
      ) : (
        <div className="pl-1">
          <div className="truncate text-[11px] font-medium text-foreground">{event.title}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </div>
          {event.location && duration > 60 && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

interface AllDayEventCardProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}

export function AllDayEventCard({ event, onClick }: AllDayEventCardProps) {
  return (
    <button
      onClick={() => onClick(event)}
      className="flex w-full items-center gap-1.5 truncate rounded-[4px] border border-border/50 bg-card px-2 py-0.5 text-left text-[10px] font-medium text-foreground hover:bg-card-hover"
    >
      <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: event.color || "#737373" }} />
      {event.title}
    </button>
  );
}

export type { CalendarEvent };
