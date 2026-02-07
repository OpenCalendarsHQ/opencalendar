"use client";

import { useState, useEffect } from "react";
import { X, MapPin, AlignLeft, Clock, Trash2 } from "lucide-react";
import { format } from "@/lib/utils/date";
import type { CalendarEvent } from "@/lib/types";

interface EventModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  isNew: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
}

export function EventModal({ event, isOpen, isNew, onClose, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);

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
    }
  }, [event]);

  if (!isOpen) return null;

  const handleSave = () => {
    const startDateTime = isAllDay
      ? new Date(`${startDate}T00:00`)
      : new Date(`${startDate}T${startTime}`);
    const endDateTime = isAllDay
      ? new Date(`${endDate}T23:59`)
      : new Date(`${endDate}T${endTime}`);

    onSave({
      id: event?.id,
      title: title || "(Geen titel)",
      description,
      location,
      startTime: startDateTime,
      endTime: endDateTime,
      isAllDay,
      color: "#737373",
      calendarId: event?.calendarId || "local",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-lg border border-border bg-popover shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">
            {isNew ? "Nieuw evenement" : "Evenement bewerken"}
          </h2>
          <div className="flex items-center gap-1">
            {!isNew && event && (
              <button onClick={() => { onDelete(event.id); onClose(); }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Voeg een titel toe" autoFocus
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground" />

          <div className="flex items-center gap-2.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex flex-wrap items-center gap-1.5">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
              {!isAllDay && (
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
              )}
              <span className="text-xs text-muted-foreground">–</span>
              {!isAllDay && (
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
              )}
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
            </div>
          </div>

          <label className="ml-6 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
            <span className="text-xs text-foreground">Hele dag</span>
          </label>

          <div className="flex items-center gap-2.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Locatie toevoegen"
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground" />
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
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            Annuleren
          </button>
          <button onClick={handleSave}
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90">
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
