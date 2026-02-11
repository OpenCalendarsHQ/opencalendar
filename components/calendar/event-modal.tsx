"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MapPin, AlignLeft, Clock, Trash2, Calendar, ExternalLink, Repeat } from "lucide-react";
import { format } from "@/lib/utils/date";
import { useSettings } from "@/lib/settings-context";
import { useCalendar } from "@/lib/calendar-context";
import type { CalendarEvent } from "@/lib/types";
import { RecurrenceEditor } from "./recurrence-editor";

interface EventModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  isNew: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
}

interface CalendarOption {
  id: string;
  name: string;
  color: string;
  isReadOnly: boolean;
}

export function EventModal({ event, isOpen, isNew, onClose, onSave, onDelete }: EventModalProps) {
  const { settings } = useSettings();
  const { calendarGroups } = useCalendar();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [rrule, setRrule] = useState<string | null>(null);
  const [showRecurrence, setShowRecurrence] = useState(false);

  // Sync calendars from context - NO API FETCH HERE
  useEffect(() => {
    if (isOpen && calendarGroups.length > 0) {
      const allCalendars: CalendarOption[] = [];
      calendarGroups.forEach((account: any) => {
        account.calendars?.forEach((cal: any) => {
          if (!cal.isReadOnly) {
            allCalendars.push({
              id: cal.id,
              name: cal.name,
              color: cal.color,
              isReadOnly: cal.isReadOnly || false,
            });
          }
        });
      });
      setCalendars(allCalendars);
      
      // Set default calendar if creating new event
      if (isNew && allCalendars.length > 0 && !calendarId) {
        const defaultId = settings.defaultCalendarId && allCalendars.some(c => c.id === settings.defaultCalendarId)
          ? settings.defaultCalendarId
          : allCalendars[0].id;
        
        setCalendarId(defaultId);
      }
    }
  }, [isOpen, isNew, calendarGroups, calendarId, settings.defaultCalendarId]);

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setLocation(event.location || "");
      setStartDate(format(event.startTime, "yyyy-MM-dd"));
      setStartTime(format(event.startTime, "HH:mm"));
      setEndDate(format(event.endTime, "yyyy-MM-dd"));
      setEndTime(format(event.endTime, "HH:mm"));
      setIsAllDay(event.isAllDay);
      setCalendarId(event.calendarId || "");
      setRrule(event.rrule || null);
      setShowRecurrence(!!event.rrule);
      // Reset map state when event changes
      setShowMap(false);
      setMapCoords(null);
    }
  }, [event]);

  // Auto-adjust end time when start time changes on the same day
  const handleStartTimeChange = useCallback((newStartTime: string) => {
    setStartTime(newStartTime);
    if (startDate === endDate && newStartTime >= endTime) {
      const [h, m] = newStartTime.split(":").map(Number);
      const endMinutes = h * 60 + m + 60;
      const endH = Math.min(23, Math.floor(endMinutes / 60));
      const endM = endMinutes % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
    }
  }, [startDate, endDate, endTime]);

  const handleStartDateChange = useCallback((newStartDate: string) => {
    setStartDate(newStartDate);
    if (newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  }, [endDate]);

  // Geocode location when showing map
  useEffect(() => {
    if (showMap && location && !mapCoords) {
      const geocodeLocation = async () => {
        setIsLoadingMap(true);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
          }
        } catch (error) {
          console.error("Failed to geocode location:", error);
        } finally {
          setIsLoadingMap(false);
        }
      };
      geocodeLocation();
    }
  }, [showMap, location, mapCoords]);

  if (!isOpen) return null;

  const handleSave = () => {
    const startDateTime = isAllDay
      ? new Date(`${startDate}T00:00:00`)
      : new Date(`${startDate}T${startTime}:00`);
    const endDateTime = isAllDay
      ? new Date(`${endDate}T23:59:59`)
      : new Date(`${endDate}T${endTime}:00`);

    // Validate: end must be after start for timed events
    if (!isAllDay && endDateTime <= startDateTime) {
      endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000);
    }

    const selectedCalendar = calendars.find(c => c.id === calendarId);
    const eventIdToSave = (event as any)?.originalId || event?.id;

    onSave({
      id: eventIdToSave,
      title: title || "(Geen titel)",
      description,
      location,
      startTime: startDateTime,
      endTime: endDateTime,
      isAllDay,
      color: selectedCalendar?.color || "#737373",
      calendarId: calendarId || event?.calendarId || "local",
      rrule,
      isRecurring: rrule !== null,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-start md:pt-[12vh]" onKeyDown={handleKeyDown}>
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-full max-h-[90dvh] overflow-y-auto rounded-t-xl border border-border bg-popover shadow-lg md:max-w-md md:rounded-lg md:rounded-t-lg safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-popover z-10">
          <h2 className="text-sm font-medium text-foreground">
            {isNew ? "Nieuw evenement" : "Evenement bewerken"}
          </h2>
          <div className="flex items-center gap-1">
            {!isNew && event && (
              <button onClick={() => { onDelete(event.id); onClose(); }}
                className="touch-target rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
              </button>
            )}
            <button onClick={onClose} className="touch-target rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          {!isNew && event?.rrule && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Dit is een herhalend evenement. Wijzigingen gelden voor alle herhalingen.
            </div>
          )}

          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Voeg een titel toe" autoFocus
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground" />

          {calendars.length > 0 && (
            <div className="flex items-center gap-2.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex flex-wrap items-center gap-1.5">
              <input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground" />
              {!isAllDay && (
                <input type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)}
                  step="900"
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
              )}
              <span className="text-xs text-muted-foreground">–</span>
              {!isAllDay && (
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  step="900"
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
              )}
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground" />
            </div>
          </div>

          <label className="ml-6 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
            <span className="text-xs text-foreground">Hele dag</span>
          </label>

          {showRecurrence ? (
            <RecurrenceEditor
              rrule={rrule}
              startDate={new Date(startDate)}
              onChange={(newRrule) => {
                setRrule(newRrule);
                if (newRrule === null) {
                  setShowRecurrence(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowRecurrence(true)}
              className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Herhaling toevoegen</span>
            </button>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setMapCoords(null);
                }}
                placeholder="Locatie toevoegen (bijv. Adres, Stad, Land)"
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
              />
              {location && (
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
                >
                  {showMap ? "Verberg" : "Kaart"}
                </button>
              )}
            </div>

            {location && showMap && (
              <div className="ml-6 space-y-2">
                {isLoadingMap ? (
                  <div className="rounded-lg border border-border bg-muted px-3 py-6 text-center text-xs text-muted-foreground">
                    Kaart laden...
                  </div>
                ) : mapCoords ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <iframe
                      width="100%"
                      height="200"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.01},${mapCoords.lat - 0.01},${mapCoords.lon + 0.01},${mapCoords.lat + 0.01}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`}
                      style={{ border: 0 }}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Google Maps
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    OpenStreetMap
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            <AlignLeft className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Notities..."
              rows={2}
              className="flex-1 resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted md:px-3 md:py-1.5 md:text-xs">
            Annuleren
          </button>
          <button onClick={handleSave}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 md:px-3 md:py-1.5 md:text-xs">
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
