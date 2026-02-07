"use client";

import { useState, useCallback } from "react";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { EventModal } from "./event-modal";
import type { CalendarEvent, CalendarViewType, Todo } from "@/lib/types";
import { setHours } from "@/lib/utils/date";

interface CalendarViewProps {
  currentDate: Date;
  viewType: CalendarViewType;
  events: CalendarEvent[];
  todos: Todo[];
  onEventsChange: (events: CalendarEvent[]) => void;
  onDateChange: (date: Date) => void;
  onViewTypeChange: (type: CalendarViewType) => void;
  onToggleTodo: (id: string) => void;
}

export function CalendarView({
  currentDate,
  viewType,
  events,
  todos,
  onEventsChange,
  onDateChange,
  onViewTypeChange,
  onToggleTodo,
}: CalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(false);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsNewEvent(false);
    setIsModalOpen(true);
  }, []);

  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    const startTime = setHours(date, hour);
    const endTime = setHours(date, hour + 1);
    setSelectedEvent({
      id: `new-${Date.now()}`,
      title: "",
      startTime,
      endTime,
      color: "#6366f1",
      calendarId: "cal-1",
      isAllDay: false,
    });
    setIsNewEvent(true);
    setIsModalOpen(true);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    onDateChange(date);
    onViewTypeChange("day");
  }, [onDateChange, onViewTypeChange]);

  const handleSaveEvent = useCallback((eventData: Partial<CalendarEvent>) => {
    if (isNewEvent) {
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        title: eventData.title || "(Geen titel)",
        startTime: eventData.startTime || new Date(),
        endTime: eventData.endTime || new Date(),
        color: eventData.color || "#6366f1",
        calendarId: eventData.calendarId || "cal-1",
        isAllDay: eventData.isAllDay || false,
        location: eventData.location,
        description: eventData.description,
      };
      onEventsChange([...events, newEvent]);
    } else {
      onEventsChange(events.map((e) => (e.id === eventData.id ? { ...e, ...eventData } : e)));
    }
  }, [events, isNewEvent, onEventsChange]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    onEventsChange(events.filter((e) => e.id !== eventId));
  }, [events, onEventsChange]);

  // Expose create for external trigger
  const openCreateModal = useCallback(() => {
    const now = new Date();
    const startTime = setHours(now, now.getHours() + 1);
    const endTime = setHours(now, now.getHours() + 2);
    setSelectedEvent({
      id: `new-${Date.now()}`,
      title: "",
      startTime,
      endTime,
      color: "#6366f1",
      calendarId: "cal-1",
      isAllDay: false,
    });
    setIsNewEvent(true);
    setIsModalOpen(true);
  }, []);

  return (
    <>
      {viewType === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          todos={todos}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleTimeSlotClick}
        />
      )}
      {viewType === "day" && (
        <DayView
          currentDate={currentDate}
          events={events}
          todos={todos}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleTimeSlotClick}
          onToggleTodo={onToggleTodo}
        />
      )}
      {viewType === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          todos={todos}
          onEventClick={handleEventClick}
          onDayClick={handleDayClick}
        />
      )}

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        isNew={isNewEvent}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </>
  );
}
