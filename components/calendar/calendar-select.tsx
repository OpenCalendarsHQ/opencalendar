"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarSelectOption {
  id: string;
  name: string;
  provider: string;
  color?: string;
}

export interface CalendarSelectGroup {
  id: string;
  provider: string;
  calendars: CalendarSelectOption[];
}

interface CalendarSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  groups: CalendarSelectGroup[];
}

const providerIcons: Record<string, string> = {
  local: "📅",
  google: "🔵",
  icloud: "☁️",
  microsoft: "🟦",
  caldav: "📆",
};

const providerLabels: Record<string, string> = {
  local: "OpenCalendar",
  google: "Google",
  icloud: "iCloud",
  microsoft: "Microsoft",
  caldav: "CalDAV",
};

export function CalendarSelect({ value, onValueChange, groups }: CalendarSelectProps) {
  const selectedCalendar = React.useMemo(() => {
    for (const group of groups) {
      const cal = group.calendars.find((c) => c.id === value);
      if (cal) return cal;
    }
    return null;
  }, [value, groups]);

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2",
          "text-sm text-foreground transition-colors",
          "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedCalendar && (
            <>
              <span className="text-base" aria-hidden="true">
                {providerIcons[selectedCalendar.provider] || "📅"}
              </span>
              <span className="truncate">{selectedCalendar.name}</span>
              <span className="text-xs text-muted-foreground">
                ({providerLabels[selectedCalendar.provider] || selectedCalendar.provider})
              </span>
            </>
          )}
        </div>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "relative z-50 min-w-[200px] overflow-hidden rounded-md border border-border",
            "bg-popover text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          position="popper"
          sideOffset={5}
        >
          <SelectPrimitive.Viewport className="p-1">
            {groups.map((group) => {
              if (group.calendars.length === 0) return null;

              return (
                <SelectPrimitive.Group key={group.id}>
                  <SelectPrimitive.Label
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground"
                    )}
                  >
                    <span className="text-sm" aria-hidden="true">
                      {providerIcons[group.provider] || "📅"}
                    </span>
                    {providerLabels[group.provider] || group.provider}
                  </SelectPrimitive.Label>

                  {group.calendars.map((calendar) => (
                    <SelectPrimitive.Item
                      key={calendar.id}
                      value={calendar.id}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-2 pl-8 pr-2",
                        "text-sm outline-none transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground",
                        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      )}
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2 flex h-4 w-4 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>

                      <SelectPrimitive.ItemText>
                        <div className="flex items-center gap-2">
                          {calendar.color && (
                            <div
                              className="h-3 w-3 rounded-full border border-border/50"
                              style={{ backgroundColor: calendar.color }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{calendar.name}</span>
                        </div>
                      </SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Group>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
