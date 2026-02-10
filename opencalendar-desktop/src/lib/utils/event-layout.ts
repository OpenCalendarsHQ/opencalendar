import type { CalendarEvent } from "../types";

export interface LayoutEvent extends CalendarEvent {
  column: number;
  totalColumns: number;
}

/**
 * Compute side-by-side layout for overlapping events.
 * Uses the Google Calendar / Outlook algorithm:
 * 1. Sort events by start time, then by duration (longest first)
 * 2. Group overlapping events into clusters
 * 3. Assign columns within each cluster
 */
export function computeEventLayout(events: CalendarEvent[]): LayoutEvent[] {
  if (events.length === 0) return [];

  // Sort: earliest start first, then longest duration first
  const sorted = [...events].sort((a, b) => {
    const diff = a.startTime.getTime() - b.startTime.getTime();
    if (diff !== 0) return diff;
    // Longer events first (they anchor columns)
    return (b.endTime.getTime() - b.startTime.getTime()) - (a.endTime.getTime() - a.startTime.getTime());
  });

  // Find overlapping clusters
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = 0;

  for (const event of sorted) {
    const eventStart = event.startTime.getTime();
    const eventEnd = event.endTime.getTime();

    if (currentCluster.length === 0 || eventStart < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, eventEnd);
    } else {
      // New cluster
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = eventEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  const result: LayoutEvent[] = [];

  for (const cluster of clusters) {
    // Track column end times
    const columns: number[] = [];

    const layoutEvents: { event: CalendarEvent; column: number }[] = [];

    for (const event of cluster) {
      const eventStart = event.startTime.getTime();

      // Find first available column
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (eventStart >= columns[col]) {
          columns[col] = event.endTime.getTime();
          layoutEvents.push({ event, column: col });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Need new column
        const col = columns.length;
        columns.push(event.endTime.getTime());
        layoutEvents.push({ event, column: col });
      }
    }

    const totalColumns = columns.length;

    for (const { event, column } of layoutEvents) {
      result.push({
        ...event,
        column,
        totalColumns,
      });
    }
  }

  return result;
}
