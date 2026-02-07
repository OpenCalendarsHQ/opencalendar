"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Calendar, Plus, Search, Settings, CheckSquare, Clock } from "lucide-react";
import { useCalendar } from "@/lib/calendar-context";
import { format } from "@/lib/utils/date";

interface CommandMenuProps {
  onCreateEvent: () => void;
  onNavigateToSettings: () => void;
  onNavigateToday: () => void;
  onNavigateToTasks?: () => void;
  onNavigateToFocus?: () => void;
  onEventClick?: (eventId: string) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  calendarId: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
}

const itemClass = "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-muted";

export function CommandMenu({ onCreateEvent, onNavigateToSettings, onNavigateToday, onNavigateToTasks, onNavigateToFocus, onEventClick }: CommandMenuProps) {
  const { commandMenuOpen, setCommandMenuOpen } = useCalendar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCommandMenuOpen((p) => !p); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setCommandMenuOpen]);

  // Fetch recent events when menu opens
  useEffect(() => {
    if (commandMenuOpen) {
      const fetchEvents = async () => {
        try {
          const now = new Date();
          const start = new Date(now);
          start.setDate(start.getDate() - 7); // Last 7 days
          const end = new Date(now);
          end.setDate(end.getDate() + 30); // Next 30 days

          const res = await fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`);
          if (res.ok) {
            const data = await res.json();
            setEvents(data.map((e: any) => ({
              ...e,
              startTime: new Date(e.startTime),
              endTime: new Date(e.endTime),
            })));
          }
        } catch (error) {
          console.error("Failed to fetch events:", error);
        }
      };
      fetchEvents();
    }
  }, [commandMenuOpen]);

  if (!commandMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] md:pt-[18vh]">
      <div className="fixed inset-0 bg-black/20" onClick={() => setCommandMenuOpen(false)} />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
        <Command className="flex flex-col">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <Command.Input placeholder="Zoeken..."
              className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <Command.List className="max-h-[320px] overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">Geen resultaten.</Command.Empty>

            {events.length > 0 && (
              <Command.Group heading="Evenementen" className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                {events.map((event) => (
                  <Command.Item
                    key={event.id}
                    onSelect={() => {
                      onEventClick?.(event.id);
                      setCommandMenuOpen(false);
                    }}
                    className={itemClass}
                    keywords={[event.title, format(event.startTime, "dd MMM"), event.location || ""].filter(Boolean)}
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm">{event.title || "(Geen titel)"}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {event.isAllDay
                          ? format(event.startTime, "dd MMM yyyy")
                          : `${format(event.startTime, "dd MMM HH:mm")} - ${format(event.endTime, "HH:mm")}`
                        }
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Acties" className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item onSelect={() => { onCreateEvent(); setCommandMenuOpen(false); }} className={itemClass}>
                <Plus className="h-3.5 w-3.5" /> Nieuw evenement
              </Command.Item>
              <Command.Item onSelect={() => { onNavigateToday(); setCommandMenuOpen(false); }} className={itemClass}>
                <Calendar className="h-3.5 w-3.5" /> Vandaag
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Navigatie" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item onSelect={() => { onNavigateToTasks?.(); setCommandMenuOpen(false); }} className={itemClass}>
                <CheckSquare className="h-3.5 w-3.5" /> Taken
              </Command.Item>
              <Command.Item onSelect={() => { onNavigateToFocus?.(); setCommandMenuOpen(false); }} className={itemClass}>
                <Clock className="h-3.5 w-3.5" /> Vandaag overzicht
              </Command.Item>
              <Command.Item onSelect={() => { onNavigateToSettings(); setCommandMenuOpen(false); }} className={itemClass}>
                <Settings className="h-3.5 w-3.5" /> Instellingen
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <span><kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">↑↓</kbd> navigeren</span>
            <span><kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">↵</kbd> selecteren</span>
            <span><kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">esc</kbd> sluiten</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
