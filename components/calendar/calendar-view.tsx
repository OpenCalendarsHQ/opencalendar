"use client";

import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { EventModal } from "./event-modal";
import { RecurringEventDialog } from "./recurring-event-dialog";
import { useSwipe } from "@/hooks/use-swipe";
import { useCalendar } from "@/lib/calendar-context";
import type { CalendarEvent, CalendarViewType, Todo } from "@/lib/types";
import { setHours } from "@/lib/utils/date";

interface CalendarViewProps {
  currentDate: Date;
  viewType: CalendarViewType;
  events: CalendarEvent[];
  rawEvents: CalendarEvent[]; // Original events with RRULE, before expansion
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
  rawEvents,
  todos,
  onEventsChange,
  onDateChange,
  onViewTypeChange,
  onToggleTodo,
}, ref) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringDialogAction, setRecurringDialogAction] = useState<"edit" | "delete">("edit");
  const [pendingEvent, setPendingEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // If this is a recurring event (either occurrence or original with rrule), show dialog
    if (event.originalId || event.rrule) {
      setPendingEvent(event);
      setRecurringDialogAction("edit");
      setShowRecurringDialog(true);
      return;
    }

    // Regular event - open modal directly
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
          // Refetch events to get the latest data with RRULE metadata
          onEventsChange();
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

      // If this is a recurring event (occurrence or original), show dialog first
      if (event?.originalId || event?.rrule) {
        setPendingEvent(event);
        setRecurringDialogAction("delete");
        setShowRecurringDialog(true);
        setIsModalOpen(false); // Close event modal while showing dialog
        return;
      }

      // Regular event - delete directly
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Refetch events to get the latest data
        onEventsChange();
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  }, [events, onEventsChange]);

  // Handle recurring event dialog choice for edit
  const handleEditThisOccurrence = useCallback(() => {
    if (!pendingEvent) return;
    setShowRecurringDialog(false);
    // For now, just open the event modal for this occurrence
    // TODO: Implement single occurrence editing
    setSelectedEvent(pendingEvent);
    setIsNewEvent(false);
    setIsModalOpen(true);
    setPendingEvent(null);
  }, [pendingEvent]);

  const handleEditAllOccurrences = useCallback(() => {
    if (!pendingEvent) return;
    setShowRecurringDialog(false);

    // If this IS the original recurring event (has rrule), use it directly
    if (pendingEvent.rrule) {
      setSelectedEvent(pendingEvent);
      setIsNewEvent(false);
      setIsModalOpen(true);
      setPendingEvent(null);
      return;
    }

    // Otherwise, find the original recurring event from rawEvents
    const originalEvent = rawEvents.find((e) => e.id === pendingEvent.originalId);
    if (originalEvent) {
      setSelectedEvent(originalEvent);
      setIsNewEvent(false);
      setIsModalOpen(true);
    }
    setPendingEvent(null);
  }, [pendingEvent, rawEvents]);

  // Handle recurring event dialog choice for delete
  const handleDeleteThisOccurrence = useCallback(async () => {
    if (!pendingEvent) return;
    setShowRecurringDialog(false);
    // TODO: Implement single occurrence deletion (requires exception dates)
    console.log("Delete single occurrence not yet implemented");
    setPendingEvent(null);
  }, [pendingEvent]);

  const handleDeleteAllOccurrences = useCallback(async () => {
    if (!pendingEvent) return;
    setShowRecurringDialog(false);

    try {
      // If this IS the original event, use its ID; otherwise use originalId
      const realId = pendingEvent.rrule ? pendingEvent.id : (pendingEvent.originalId || pendingEvent.id);
      const res = await fetch(`/api/events?id=${realId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onEventsChange();
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
    setPendingEvent(null);
  }, [pendingEvent, onEventsChange]);

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

      <RecurringEventDialog
        isOpen={showRecurringDialog}
        action={recurringDialogAction}
        onClose={() => {
          setShowRecurringDialog(false);
          setPendingEvent(null);
        }}
        onEditThis={handleEditThisOccurrence}
        onEditAll={handleEditAllOccurrences}
        onDeleteThis={handleDeleteThisOccurrence}
        onDeleteAll={handleDeleteAllOccurrences}
      />
    </div>
  );
});

CalendarView.displayName = "CalendarView";
