"use client";

import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { EventModal } from "./event-modal";
import { RecurringEventDialog } from "./recurring-event-dialog";
import { useSwipe } from "@/hooks/use-swipe";
import { useWheelNavigation } from "@/hooks/use-wheel-navigation";
import { useCalendar } from "@/lib/calendar-context";
import type { CalendarEvent, CalendarViewType, Todo } from "@/lib/types";
import { setHours, setMinutes } from "@/lib/utils/date";

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
    const startTime = setMinutes(setHours(date, hour), 0);
    const endTime = setMinutes(setHours(date, hour + 1), 0);
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

  // Drag-to-create: precise start/end with minute-level granularity
  const handleDragCreate = useCallback((date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const startTime = setMinutes(setHours(new Date(date), startHour), startMinute);
    const endTime = setMinutes(setHours(new Date(date), endHour), endMinute);
    startTime.setSeconds(0, 0);
    endTime.setSeconds(0, 0);
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

  // Handle task drop from sidebar
  const handleTaskDrop = useCallback(async (task: any, date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const startTime = setMinutes(setHours(new Date(date), startHour), startMinute);
    const endTime = setMinutes(setHours(new Date(date), endHour), endMinute);
    startTime.setSeconds(0, 0);
    endTime.setSeconds(0, 0);

    try {
      // Schedule the task by creating a calendar event
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          taskId: task.id,
          eventData: {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isAllDay: false,
            color: "#8b5cf6", // Purple for tasks
          },
        }),
      });

      if (response.ok) {
        // Refresh events to show the new scheduled task
        onEventsChange();
      } else {
        console.error("Failed to schedule task");
      }
    } catch (error) {
      console.error("Error scheduling task:", error);
    }
  }, [onEventsChange]);

  const handleDayClick = useCallback((date: Date) => {
    onDateChange(date);
    onViewTypeChange("day");
  }, [onDateChange, onViewTypeChange]);

  const handleSaveEvent = useCallback(async (eventData: Partial<CalendarEvent> & {
    isSingleOccurrenceEdit?: boolean;
    originalRecurringEventId?: string;
    originalOccurrenceDate?: string;
  }) => {
    try {
      // Check if this is a single occurrence edit of a recurring event
      if (eventData.isSingleOccurrenceEdit && eventData.originalRecurringEventId && eventData.originalOccurrenceDate) {
        // Step 1: Add EXDATE to the original recurring event
        const exRes = await fetch("/api/events/exception", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: eventData.originalRecurringEventId,
            exceptionDate: eventData.originalOccurrenceDate,
          }),
        });

        if (!exRes.ok) {
          console.error("Failed to add exception date");
          return;
        }

        // Step 2: Create a new single event with the edited details
        const createRes = await fetch("/api/events", {
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

        if (createRes.ok) {
          onEventsChange();
        }
        return;
      }

      if (isNewEvent) {
        // Optimistic update: trigger refetch immediately
        onEventsChange();

        // Create new event via API (background, non-blocking)
        fetch("/api/events", {
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
        }).then(res => {
          if (res.ok) {
            // Refetch to ensure consistency
            onEventsChange();
          }
        });
      } else {
        // Optimistic update: trigger refetch immediately
        onEventsChange();

        // Update existing event via API (background, non-blocking)
        fetch("/api/events", {
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
        }).then(res => {
          if (res.ok) {
            // Refetch to ensure consistency
            onEventsChange();
          }
        });
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  }, [isNewEvent, onEventsChange]);

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

      // Optimistic update: trigger refetch immediately
      onEventsChange();

      // Regular event - delete directly (background, non-blocking)
      fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
      }).then(res => {
        if (res.ok) {
          // Refetch to ensure consistency
          onEventsChange();
        }
      });
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  }, [events, onEventsChange]);

  // Handle recurring event dialog choice for edit
  const handleEditThisOccurrence = useCallback(() => {
    if (!pendingEvent) return;
    setShowRecurringDialog(false);

    const eventForEditing = {
      ...pendingEvent,
      isSingleOccurrenceEdit: true,
      originalRecurringEventId: pendingEvent.originalId || pendingEvent.id,
      originalOccurrenceDate: pendingEvent.startTime.toISOString(),
    };

    setSelectedEvent(eventForEditing);
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

    try {
      // Find the original recurring event
      const originalId = pendingEvent.originalId || pendingEvent.id;
      const originalEvent = rawEvents.find((e) => e.id === originalId);

      if (!originalEvent) {
        console.error("Original recurring event not found");
        setPendingEvent(null);
        return;
      }

      const exceptionDate = pendingEvent.startTime.toISOString();

      const res = await fetch("/api/events/exception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: originalId,
          exceptionDate,
        }),
      });

      if (res.ok) {
        onEventsChange();
      } else {
        console.error("Failed to add exception date");
      }
    } catch (error) {
      console.error("Failed to delete single occurrence:", error);
    }

    setPendingEvent(null);
  }, [pendingEvent, rawEvents, onEventsChange]);

  const handleDeleteAllOccurrences = useCallback(async () => {
    if (!pendingEvent) return;
    setShowRecurringDialog(false);

    try {
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
    const startTime = setMinutes(setHours(now, now.getHours() + 1), 0);
    const endTime = setMinutes(setHours(now, now.getHours() + 2), 0);
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

  // Horizontal scroll navigation
  useWheelNavigation({
    onScrollLeft: calendar.navigateBack,
    onScrollRight: calendar.navigateForward,
    enabled: viewType !== "month",
    threshold: 150,
    cooldown: 400,
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
          onDragCreate={handleDragCreate}
          onTaskDrop={handleTaskDrop}
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
          onDragCreate={handleDragCreate}
          onTaskDrop={handleTaskDrop}
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
