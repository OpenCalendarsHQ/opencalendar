import type { Calendar, CalendarAccount, Event, Settings } from "./types";
import { offlineCache } from "./offline-cache";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "Request failed",
        }));
        throw new Error(error.error || "Request failed");
      }

      // Mark as online
      offlineCache.setOfflineStatus(false);
      return response.json();
    } catch (error) {
      // Network error - mark as offline
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Network error detected, marking as offline');
        offlineCache.setOfflineStatus(true);
      }
      throw error;
    }
  }

  // Auth endpoints
  async refreshToken(refreshToken: string): Promise<{
    token: string;
    userId: string;
    email: string;
  }> {
    return this.request("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Calendar endpoints
  async getCalendars(): Promise<CalendarAccount[]> {
    return this.request("/api/calendars");
  }

  async createCalendar(data: {
    name: string;
    color?: string;
  }): Promise<Calendar> {
    return this.request("/api/calendars", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCalendar(data: {
    id: string;
    name?: string;
    color?: string;
    isVisible?: boolean;
  }): Promise<Calendar> {
    return this.request("/api/calendars", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteCalendarAccount(accountId: string): Promise<void> {
    await this.request(`/api/calendars?accountId=${accountId}`, {
      method: "DELETE",
    });
  }

  // Event endpoints
  async getEvents(start: Date, end: Date, calendarId?: string): Promise<Event[]> {
    const query = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      ...(calendarId && { calendarId }),
    });
    return this.request(`/api/events?${query}`);
  }

  async createEvent(data: {
    calendarId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    isAllDay?: boolean;
    location?: string;
    color?: string;
    timezone?: string;
  }): Promise<Event> {
    try {
      const result = await this.request<Event>("/api/events", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return result;
    } catch (error) {
      // If offline, add to sync queue and create optimistic local event
      if (offlineCache.isOffline()) {
        console.log('Offline: queuing event creation');
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticEvent = {
          id: tempId,
          ...data,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          isAllDay: data.isAllDay || false,
          isRecurring: false,
          color: data.color || '#737373',
        };

        offlineCache.addCachedEvent(optimisticEvent);
        offlineCache.addToSyncQueue({
          type: 'create',
          resource: 'event',
          data,
        });

        return optimisticEvent as Event;
      }
      throw error;
    }
  }

  async updateEvent(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      isAllDay: boolean;
      location: string;
      color: string;
      calendarId: string;
    }>
  ): Promise<Event> {
    try {
      const result = await this.request<Event>("/api/events", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      });
      return result;
    } catch (error) {
      // If offline, add to sync queue and update local cache
      if (offlineCache.isOffline()) {
        console.log('Offline: queuing event update');
        offlineCache.updateCachedEvent(id, data);
        offlineCache.addToSyncQueue({
          type: 'update',
          resource: 'event',
          data: { id, ...data },
        });

        // Return optimistic result
        const events = offlineCache.getEvents() || [];
        const updated = events.find(e => e.id === id);
        if (updated) {
          return updated as Event;
        }
      }
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      await this.request(`/api/events?id=${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      // If offline, add to sync queue and remove from local cache
      if (offlineCache.isOffline()) {
        console.log('Offline: queuing event deletion');
        offlineCache.removeCachedEvent(id);
        offlineCache.addToSyncQueue({
          type: 'delete',
          resource: 'event',
          data: { id },
        });
        return; // Don't throw error for offline deletes
      }
      throw error;
    }
  }

  async addEventException(
    eventId: string,
    exceptionDate: string
  ): Promise<{ success: boolean; exDates: string[] }> {
    return this.request("/api/events/exception", {
      method: "POST",
      body: JSON.stringify({ eventId, exceptionDate }),
    });
  }

  // Settings endpoints
  async getSettings(): Promise<Settings | null> {
    return this.request("/api/settings");
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    return this.request("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Sync endpoints
  async syncGoogle(): Promise<{ success: boolean }> {
    return this.request("/api/sync/google", { method: "POST" });
  }

  async syncICloud(): Promise<{ success: boolean }> {
    return this.request("/api/sync/icloud", { method: "POST" });
  }

  async syncMicrosoft(): Promise<{ success: boolean }> {
    return this.request("/api/sync/microsoft", { method: "POST" });
  }
}

export const api = new ApiClient();
export const apiClient = api; // Alias for consistency
