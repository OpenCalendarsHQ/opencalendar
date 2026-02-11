"use client";

import { memo } from "react";
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

export const EventCard = memo(function EventCard({ event, style, onClick }: EventCardProps) {
  const { settings } = useSettings();
  const use24h = settings.timeFormat === "24h";
  const duration =
    (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
  const isCompact = duration <= 30;

  // Calculate horizontal position for overlapping events
  const columnWidth = 100 / event.totalColumns;
  const left = event.column * columnWidth;
  const width = columnWidth + (event.totalColumns > 1 ? 0.5 : 0);

  // Convert hex color to background based on style
  const eventColor = event.color || "#737373";
  const opacity = settings.eventOpacity / 100;
  
  let backgroundColor: string;
  let backgroundImage: string | undefined;
  
  if (settings.eventBackgroundStyle === "solid") {
    backgroundColor = `${eventColor}${Math.round(opacity * 0.15 * 255).toString(16).padStart(2, '0')}`;
  } else if (settings.eventBackgroundStyle === "gradient") {
    backgroundColor = "transparent";
    backgroundImage = `linear-gradient(135deg, ${eventColor}${Math.round(opacity * 0.2 * 255).toString(16).padStart(2, '0')}, ${eventColor}${Math.round(opacity * 0.08 * 255).toString(16).padStart(2, '0')})`;
  } else {
    // glass effect
    backgroundColor = `${eventColor}${Math.round(opacity * 0.1 * 255).toString(16).padStart(2, '0')}`;
  }
  
  const borderColor = `${eventColor}${Math.round(opacity * 0.4 * 255).toString(16).padStart(2, '0')}`;

  // Apply settings for styling
  const fontSizeClass = {
    xs: "text-[10px]",
    sm: "text-[11px]",
    base: "text-xs",
  }[settings.eventFontSize];

  const paddingClass = {
    tight: "px-1.5 py-0.5",
    normal: "px-2 py-1",
    relaxed: "px-3 py-1.5",
  }[settings.eventPadding];

  const shadowClass = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
  }[settings.eventShadow];

  const fontWeightClass = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  }[settings.eventTitleWeight];

  const alignmentClass = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  }[settings.eventTextAlignment || "left"];

  return (
    <EventHoverCard event={event}>
      <button
        data-event
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClick(event);
        }}
        className={`absolute z-10 flex cursor-pointer flex-col justify-start overflow-hidden transition-colors hover:z-20 ${alignmentClass} ${paddingClass} ${fontSizeClass} ${shadowClass}`}
        style={{
          ...style,
          left: `${left}%`,
          width: `calc(${width}% - 8px)`,
          marginLeft: "4px",
          backgroundColor,
          backgroundImage,
          borderRadius: `${settings.eventCornerRadius}px`,
          borderLeft: settings.showEventBorder 
            ? `${settings.eventBorderWidth}px ${settings.eventBorderStyle} ${eventColor}`
            : undefined,
          borderTop: settings.showEventBorder && settings.eventBorderStyle !== "none"
            ? `1px ${settings.eventBorderStyle} ${borderColor}`
            : undefined,
          borderRight: settings.showEventBorder && settings.eventBorderStyle !== "none"
            ? `1px ${settings.eventBorderStyle} ${borderColor}`
            : undefined,
          borderBottom: settings.showEventBorder && settings.eventBorderStyle !== "none"
            ? `1px ${settings.eventBorderStyle} ${borderColor}`
            : undefined,
          backdropFilter: settings.eventBackgroundStyle === "glass" ? "blur(8px)" : undefined,
        }}
      >
        {settings.showEventBorder && (
          <div className="absolute left-0 top-0 h-full" 
            style={{ 
              width: `${settings.eventBorderWidth}px`, 
              backgroundColor: eventColor 
            }} 
          />
        )}

        {isCompact ? (
          <div className="flex items-start gap-1.5 pl-1">
            <span className={`${fontWeightClass} leading-tight text-foreground break-words flex-1`}>{event.title}</span>
            {settings.showTimeInCompact && (
              <span className="shrink-0 text-[10px] leading-tight text-muted-foreground">{formatTime(event.startTime, use24h)}</span>
            )}
          </div>
        ) : (
          <div className="pl-1">
            <div className={`${fontWeightClass} leading-tight text-foreground break-words`}>{event.title}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              {formatTime(event.startTime, use24h)} – {formatTime(event.endTime, use24h)}
            </div>
            {settings.showLocationIcon && event.location && duration > 60 && event.totalColumns <= 2 && (
              <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="break-words">{event.location}</span>
              </div>
            )}
          </div>
        )}
      </button>
    </EventHoverCard>
  );
});

/** Multi-day event banner shown in all-day / header section */
interface MultiDayEventCardProps {
  event: CalendarEvent;
  span: number; // number of day columns this event spans
  startCol: number; // 0-based column index where it starts
  totalCols: number; // total columns in view
  onClick: (event: CalendarEvent) => void;
}

export const MultiDayEventCard = memo(function MultiDayEventCard({ event, span, startCol, totalCols, onClick }: MultiDayEventCardProps) {
  const widthPercent = (span / totalCols) * 100;
  const leftPercent = (startCol / totalCols) * 100;

  return (
    <EventHoverCard event={event}>
      <button
        data-event
        onMouseDown={(e) => e.stopPropagation()}
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
});

interface AllDayEventCardProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}

export const AllDayEventCard = memo(function AllDayEventCard({ event, onClick }: AllDayEventCardProps) {
  return (
    <EventHoverCard event={event}>
      <button
        data-event
        onMouseDown={(e) => e.stopPropagation()}
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
});

export type { CalendarEvent };
