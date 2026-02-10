import { X, MapPin, AlignLeft, Clock, Trash2, Calendar, Save, Repeat } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { CalendarEvent, CalendarGroup } from "../../lib/types";
import { apiClient } from "../../lib/api";

interface EventEditModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  isNew: boolean;
  calendarGroups: CalendarGroup[];
  onClose: () => void;
  onSave: () => void;
}

export function EventEditModal({
  event,
  isOpen,
  isNew,
  calendarGroups,
  onClose,
  onSave
}: EventEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [rrule, setRrule] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get writable calendars
  const writableCalendars = calendarGroups
    .flatMap(g => g.calendars)
    .filter(c => !c.isReadOnly);

  useEffect(() => {
    if (event && isOpen) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setLocation(event.location || "");

      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      setStartDate(formatDateForInput(start));
      setStartTime(formatTimeForInput(start));
      setEndDate(formatDateForInput(end));
      setEndTime(formatTimeForInput(end));
      setIsAllDay(event.isAllDay);
      setCalendarId(event.calendarId || "");
      setRrule(event.rrule || null);
    } else if (isNew && isOpen) {
      // Reset for new event
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      setTitle("");
      setDescription("");
      setLocation("");
      setStartDate(formatDateForInput(now));
      setStartTime(formatTimeForInput(now));
      setEndDate(formatDateForInput(oneHourLater));
      setEndTime(formatTimeForInput(oneHourLater));
      setIsAllDay(false);
      setCalendarId(writableCalendars[0]?.id || "");
      setRrule(null);
    }
  }, [event, isOpen, isNew, writableCalendars]);

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

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

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Titel is verplicht");
      return;
    }

    if (!calendarId) {
      alert("Selecteer een kalender");
      return;
    }

    setIsSaving(true);
    try {
      const startDateTime = isAllDay
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime}:00`;
      const endDateTime = isAllDay
        ? `${endDate}T23:59:59`
        : `${endDate}T${endTime}:00`;

      const eventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        isAllDay,
        calendarId,
        rrule: rrule || undefined,
      };

      if (isNew) {
        await apiClient.createEvent(eventData);
      } else if (event) {
        await apiClient.updateEvent(event.id, eventData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Fout bij opslaan: " + (error instanceof Error ? error.message : "Onbekende fout"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || isNew) return;

    if (!confirm("Weet je zeker dat je dit evenement wilt verwijderen?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.deleteEvent(event.id);
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Fout bij verwijderen: " + (error instanceof Error ? error.message : "Onbekende fout"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isNew ? "Nieuw evenement" : "Evenement bewerken"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500"
              placeholder="Evenement titel"
              autoFocus
            />
          </div>

          {/* Calendar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Kalender *
            </label>
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500"
            >
              {writableCalendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">
              Hele dag
            </label>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500 mt-2"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Einde
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500 mt-2"
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locatie
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500"
              placeholder="Voeg locatie toe"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <AlignLeft className="h-4 w-4" />
              Beschrijving
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none"
              placeholder="Voeg beschrijving toe"
              rows={3}
            />
          </div>

          {/* Recurring indicator (read-only for now) */}
          {rrule && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              <Repeat className="h-4 w-4" />
              <span>Dit is een terugkerend evenement</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Verwijderen..." : "Verwijderen"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
