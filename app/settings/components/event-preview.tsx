"use client";

import { useSettings } from "@/lib/settings-context";
import { MapPin, Calendar } from "lucide-react";

export function EventPreview() {
  const { settings } = useSettings();

  // Sample events with different durations
  const sampleEvents = [
    {
      title: "Team Meeting",
      startTime: "09:00",
      endTime: "10:00",
      location: "Conference Room A",
      color: "#3b82f6",
      duration: 60,
    },
    {
      title: "Quick Standup",
      startTime: "10:30",
      endTime: "10:45",
      location: "Online",
      color: "#10b981",
      duration: 15,
    },
    {
      title: "Project Review",
      startTime: "14:00",
      endTime: "16:00",
      location: "Main Office",
      color: "#f59e0b",
      duration: 120,
    },
  ];

  const getEventStyles = (color: string) => {
    const opacity = settings.eventOpacity / 100;
    
    let backgroundColor: string;
    if (settings.eventBackgroundStyle === "solid") {
      backgroundColor = `${color}${Math.round(opacity * 0.15 * 255).toString(16).padStart(2, '0')}`;
    } else if (settings.eventBackgroundStyle === "gradient") {
      backgroundColor = `linear-gradient(135deg, ${color}${Math.round(opacity * 0.2 * 255).toString(16).padStart(2, '0')}, ${color}${Math.round(opacity * 0.08 * 255).toString(16).padStart(2, '0')})`;
    } else {
      // glass effect
      backgroundColor = `${color}${Math.round(opacity * 0.1 * 255).toString(16).padStart(2, '0')}`;
    }

    const borderColor = `${color}${Math.round(opacity * 0.4 * 255).toString(16).padStart(2, '0')}`;
    
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

    return {
      backgroundColor,
      borderColor,
      fontSizeClass,
      paddingClass,
      shadowClass,
      fontWeightClass,
      mainColor: color,
    };
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Calendar className="h-4 w-4" />
          <span>Voorbeeld Weergave</span>
        </div>
        
        <div className="space-y-3">
          {sampleEvents.map((event, idx) => {
            const styles = getEventStyles(event.color);
            const isCompact = event.duration <= 30;
            
            return (
              <div
                key={idx}
                className={`relative overflow-hidden ${styles.paddingClass} ${styles.fontSizeClass} ${styles.shadowClass}`}
                style={{
                  background: settings.eventBackgroundStyle === "gradient" 
                    ? styles.backgroundColor 
                    : undefined,
                  backgroundColor: settings.eventBackgroundStyle !== "gradient"
                    ? styles.backgroundColor
                    : undefined,
                  borderRadius: `${settings.eventCornerRadius}px`,
                  borderLeft: settings.showEventBorder 
                    ? `${settings.eventBorderWidth}px ${settings.eventBorderStyle} ${styles.mainColor}`
                    : undefined,
                  borderTop: settings.showEventBorder && settings.eventBorderStyle !== "none"
                    ? `1px ${settings.eventBorderStyle} ${styles.borderColor}`
                    : undefined,
                  borderRight: settings.showEventBorder && settings.eventBorderStyle !== "none"
                    ? `1px ${settings.eventBorderStyle} ${styles.borderColor}`
                    : undefined,
                  borderBottom: settings.showEventBorder && settings.eventBorderStyle !== "none"
                    ? `1px ${settings.eventBorderStyle} ${styles.borderColor}`
                    : undefined,
                  backdropFilter: settings.eventBackgroundStyle === "glass" ? "blur(8px)" : undefined,
                }}
              >
                {isCompact ? (
                  <div className="flex items-start gap-1.5">
                    <span className={`${styles.fontWeightClass} leading-tight text-foreground break-words flex-1`}>
                      {event.title}
                    </span>
                    {settings.showTimeInCompact && (
                      <span className="shrink-0 text-[10px] leading-tight text-muted-foreground">
                        {event.startTime}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className={`${styles.fontWeightClass} leading-tight text-foreground break-words`}>
                      {event.title}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                      {event.startTime} – {event.endTime}
                    </div>
                    {settings.showLocationIcon && event.location && event.duration > 60 && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="break-words">{event.location}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
