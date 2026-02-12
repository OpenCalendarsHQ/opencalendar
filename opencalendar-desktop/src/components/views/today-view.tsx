import { Sun, Moon, Coffee, Sunset, Clock, MapPin } from "lucide-react";
import type { CalendarEvent } from "../../lib/types";

interface TodayViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: "Goedenacht", icon: Moon };
  if (hour < 12) return { greeting: "Goedemorgen", icon: Coffee };
  if (hour < 18) return { greeting: "Goedemiddag", icon: Sun };
  return { greeting: "Goedenavond", icon: Sunset };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TodayView({ events, onEventClick }: TodayViewProps) {
  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay.icon;
  const now = new Date();

  // Filter events for today
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayEvents = events
    .filter((e) => {
      const eventStart = new Date(e.startTime);
      return eventStart >= todayStart && eventStart < todayEnd;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const currentEvent = todayEvents.find(
    (e) => new Date(e.startTime) <= now && new Date(e.endTime) > now
  );

  const todayFormatted = now.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TimeIcon className="h-5 w-5" />
            <span className="text-sm capitalize">{todayFormatted}</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {timeOfDay.greeting}
          </h1>
          <p className="text-sm text-muted-foreground">
            {todayEvents.length} evenement{todayEvents.length !== 1 ? "en" : ""} vandaag
          </p>
        </div>

        {/* Current Event */}
        {currentEvent && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-green-600">
                Nu bezig
              </span>
            </div>
            <div
              onClick={() => onEventClick(currentEvent)}
              className="rounded-lg border-2 border-green-500 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div
                className="h-1 w-16 rounded-full mb-3"
                style={{ backgroundColor: currentEvent.color || "#737373" }}
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentEvent.title}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatTime(new Date(currentEvent.startTime))} –{" "}
                  {formatTime(new Date(currentEvent.endTime))}
                </span>
                {currentEvent.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {currentEvent.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Agenda voor vandaag
          </h2>

          {todayEvents.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-12 text-center">
              <Sun className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Geen evenementen vandaag</p>
              <p className="text-xs text-gray-400 mt-1">Geniet van je vrije dag!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((event) => {
                const isPast = new Date(event.endTime) < now;
                const isCurrent = event.id === currentEvent?.id;

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`flex items-center gap-4 rounded-lg bg-white px-5 py-4 transition-all cursor-pointer ${
                      isCurrent
                        ? "ring-2 ring-green-500"
                        : isPast
                        ? "opacity-50 hover:opacity-75"
                        : "hover:shadow-md border border-gray-200"
                    }`}
                  >
                    {/* Time */}
                    <div className="w-20 shrink-0 text-right">
                      <span
                        className={`text-sm font-medium ${
                          isPast ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {formatTime(new Date(event.startTime))}
                      </span>
                    </div>

                    {/* Color indicator */}
                    <div
                      className="h-12 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color || "#737373" }}
                    />

                    {/* Event details */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-sm font-medium ${
                          isPast
                            ? "text-gray-400 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {event.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>
                          {formatTime(new Date(event.startTime))} –{" "}
                          {formatTime(new Date(event.endTime))}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
