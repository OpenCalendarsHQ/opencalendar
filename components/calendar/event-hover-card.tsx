"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { formatTime, format, locale } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { Clock, MapPin, AlignLeft, Repeat } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EventHoverCardProps {
  event: CalendarEvent;
  children: React.ReactNode;
}

export function EventHoverCard({ event, children }: EventHoverCardProps) {
  const { settings } = useSettings();
  const use24h = settings.timeFormat === "24h";

  // Format duration
  const durationMs = event.endTime.getTime() - event.startTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationHours = Math.floor(durationMinutes / 60);
  const durationRemainder = durationMinutes % 60;

  let durationText = "";
  if (durationHours > 0) {
    durationText = `${durationHours}u ${durationRemainder}m`;
  } else {
    durationText = `${durationMinutes}m`;
  }

  return (
    <HoverCardPrimitive.Root openDelay={300} closeDelay={100}>
      <HoverCardPrimitive.Trigger asChild>
        {children}
      </HoverCardPrimitive.Trigger>

      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="top"
          align="start"
          sideOffset={5}
          className={cn(
            "z-50 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {/* Color bar at top */}
          <div
            className="absolute left-0 top-0 h-1 w-full rounded-t-lg"
            style={{ backgroundColor: event.color || "#737373" }}
          />

          {/* Title */}
          <div className="mt-2 mb-3">
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {event.title || "(Geen titel)"}
            </h3>
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            {/* Date & Time */}
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 text-sm text-foreground">
                <div className="font-medium">
                  {format(event.startTime, "EEEE d MMMM yyyy", { locale })}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {event.isAllDay ? (
                    "Hele dag"
                  ) : (
                    <>
                      {formatTime(event.startTime, use24h)} – {formatTime(event.endTime, use24h)}
                      <span className="text-xs ml-1.5">({durationText})</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Recurring indicator */}
            {(event.rrule || event.originalId) && (
              <div className="flex items-center gap-2.5">
                <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Terugkerende afspraak
                </span>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">
                  {event.location}
                </span>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-2.5">
                <AlignLeft className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-foreground line-clamp-3">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Klik om details te bekijken en te bewerken
            </p>
          </div>

          <HoverCardPrimitive.Arrow className="fill-border" />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
