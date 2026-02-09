"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Coffee, Sunset, Clock, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTodos } from "@/hooks/use-todos";
import { formatTime } from "@/lib/utils/date";
import type { CalendarEvent } from "@/lib/types";

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: "Goedenacht", icon: Moon };
  if (hour < 12) return { greeting: "Goedemorgen", icon: Coffee };
  if (hour < 18) return { greeting: "Goedemiddag", icon: Sun };
  return { greeting: "Goedenavond", icon: Sunset };
}

export default function TodayPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { todos, toggleTodo } = useTodos();
  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay.icon;

  useEffect(() => {
    const fetchTodayEvents = async () => {
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        const res = await fetch(`/api/events?start=${start}&end=${end}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setEvents(data.map((e: Record<string, unknown>) => ({
              id: e.id as string,
              title: (e.title as string) || "Geen titel",
              startTime: new Date(e.startTime as string),
              endTime: new Date(e.endTime as string),
              color: (e.color as string) || "#737373",
              calendarId: (e.calendarId as string) || "local",
              isAllDay: (e.isAllDay as boolean) || false,
              location: e.location as string | undefined,
            })));
          }
        }
      } catch { /* no events */ }
    };
    fetchTodayEvents();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTodos = todos.filter((t) => !t.completed && t.dueDate?.toISOString().split("T")[0] === todayStr);
  const now = new Date();
  const currentEvent = events.find((e) => e.startTime <= now && e.endTime > now);

  const todayFormatted = now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-6 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TimeIcon className="h-3.5 w-3.5" />
            <span className="text-xs capitalize">{todayFormatted}</span>
          </div>
          <h1 className="mt-1 font-pixel text-xl font-bold text-foreground">{timeOfDay.greeting}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {events.length} evenement{events.length !== 1 ? "en" : ""} · {todayTodos.length} {todayTodos.length === 1 ? "taak" : "taken"}
          </p>
        </div>

        {/* Current event */}
        {currentEvent && (
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-current-time" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-current-time">Nu bezig</span>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium text-foreground">{currentEvent.title}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(currentEvent.startTime)} – {formatTime(currentEvent.endTime)}</span>
                {currentEvent.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{currentEvent.location}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Schema</span>
            <Link href="/" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
              Kalender <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Geen evenementen vandaag</div>
          ) : (
            <div className="space-y-px">
              {events.map((event) => {
                const isPast = event.endTime < now;
                return (
                  <div key={event.id} className={`flex items-center gap-3 rounded-md px-2 py-2 ${isPast ? "opacity-40" : "hover:bg-muted"}`}>
                    <span className="w-12 shrink-0 text-right text-[11px] text-muted-foreground">{formatTime(event.startTime)}</span>
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: event.color || "#737373" }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs ${isPast ? "text-muted-foreground line-through" : "text-foreground"}`}>{event.title}</div>
                      {event.location && <div className="text-[10px] text-muted-foreground">{event.location}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's tasks */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Taken</span>
            <Link href="/dashboard/tasks" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
              Alle taken <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {todayTodos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Geen taken voor vandaag</div>
          ) : (
            <div className="space-y-px">
              {todayTodos.map((todo) => (
                <button key={todo.id} onClick={() => toggleTodo(todo.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-muted">
                  <div className="h-3.5 w-3.5 shrink-0 rounded-sm border border-muted-foreground/40" />
                  <span className="text-xs text-foreground">{todo.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
