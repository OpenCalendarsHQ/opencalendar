"use client";

import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { EventModal } from "./event-modal";
import { useSwipe } from "@/hooks/use-swipe";
import { useCalendar } from "@/lib/calendar-context";
import type { CalendarEvent, CalendarViewType, Todo } from "@/lib/types";
import { setHours } from "@/lib/utils/date";

interface CalendarViewProps {
  currentDate: Date;
  viewType: CalendarViewType;
  events: CalendarEvent[];
  todos: Todo[];
  onEventsChange: () => void;
  onDateChange: (date: Date) => void;
  onViewTypeChange: (type: CalendarViewType) => void;
  onToggleTodo: (id: string) => void;
}

export interface CalendarViewRef {
  openCreateModal: () => void;
  openEventModal: (eventId: string) => void;
}

export const CalendarView = forwardRef<CalendarViewRef, CalendarViewProps>(({
  currentDate,
  viewType,
  events,
  todos,
  onEventsChange,
  onDateChange,
  onViewTypeChange,
  onToggleTodo,
}, ref) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(false);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // If this is a multi-day segment, find the original full event
    let targetEvent = event;
    if (event.originalId) {
      const original = events.find((e) => e.id === event.originalId);
      if (original) {
        targetEvent = original;
      }
    }
    setSelectedEvent(targetEvent);
    setIsNewEvent(false);
    setIsModalOpen(true);
  }, [events]);

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

  const handleSaveEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    try {
      if (isNewEvent) {
        // Create new event via API
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: eventData.calendarId,
            title: eventData.title || "(Geen titel)",
            description: eventData.description,
            startTime: eventData.startTime?.toISOString(),
            endTime: eventData.endTime?.toISOString(),
            isAllDay: eventData.isAllDay || false,
            location: eventData.location,
            color: eventData.color,
          }),
        });
        if (res.ok) {
          // Refetch events to get the latest data with RRULE metadata
          onEventsChange();
        }
      } else {
        // Update existing event via API
        const res = await fetch("/api/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: eventData.id,
            calendarId: eventData.calendarId,
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime?.toISOString(),
            endTime: eventData.endTime?.toISOString(),
            isAllDay: eventData.isAllDay,
            location: eventData.location,
            color: eventData.color,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          onEventsChange(events.map((e) => (e.id === updated.id ? {
            ...updated,
            startTime: new Date(updated.startTime),
            endTime: new Date(updated.endTime),
          } : e)));
        }
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  }, [events, isNewEvent, onEventsChange]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      // Resolve original event ID if this was a multi-day segment or recurring occurrence
      const event = events.find((e) => e.id === eventId);
      const realId = event?.originalId || eventId;

      const res = await fetch(`/api/events?id=${realId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Filter out the deleted event AND all its occurrences (for recurring events)
        onEventsChange(events.filter((e) => {
          const eRealId = e.originalId || e.id;
          return eRealId !== realId;
        }));
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
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

  // Expose open event for external trigger
  const openEventModal = useCallback((eventId: string) => {
    const event = events.find((e) => e.id === eventId || e.originalId === eventId);
    if (event) {
      // If this is a multi-day segment, find the original full event
      let targetEvent = event;
      if (event.originalId) {
        const original = events.find((e) => e.id === event.originalId);
        if (original) {
          targetEvent = original;
        }
      }
      setSelectedEvent(targetEvent);
      setIsNewEvent(false);
      setIsModalOpen(true);
    }
  }, [events]);

  useImperativeHandle(ref, () => ({
    openCreateModal,
    openEventModal,
  }), [openCreateModal, openEventModal]);

  // Swipe navigation for mobile
  const calendar = useCalendar();
  const swipeHandlers = useSwipe({
    onSwipeLeft: calendar.navigateForward,
    onSwipeRight: calendar.navigateBack,
  });

  return (
    <div className="h-full" {...swipeHandlers}>
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
    </div>
  );
});

CalendarView.displayName = "CalendarView";
