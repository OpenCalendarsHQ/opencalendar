/**
 * Simple offline cache using localStorage
 * Stores calendars and events locally for offline access
 */

const CACHE_KEYS = {
  CALENDARS: 'offline_calendars',
  EVENTS: 'offline_events',
  LAST_SYNC: 'offline_last_sync',
};

const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export const offlineCache = {
  // Calendars
  saveCalendars(calendars: any[]) {
    try {
      localStorage.setItem(CACHE_KEYS.CALENDARS, JSON.stringify(calendars));
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Failed to save calendars to cache:', error);
    }
  },

  getCalendars(): any[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEYS.CALENDARS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get calendars from cache:', error);
      return null;
    }
  },

  // Events
  saveEvents(events: any[]) {
    try {
      localStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to save events to cache:', error);
    }
  },

  getEvents(): any[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEYS.EVENTS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get events from cache:', error);
      return null;
    }
  },

  // Cache status
  isCacheValid(): boolean {
    try {
      const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
      if (!lastSync) return false;

      const timeSinceSync = Date.now() - parseInt(lastSync);
      return timeSinceSync < CACHE_DURATION;
    } catch (error) {
      return false;
    }
  },

  getLastSyncTime(): Date | null {
    try {
      const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return lastSync ? new Date(parseInt(lastSync)) : null;
    } catch (error) {
      return null;
    }
  },

  // Clear cache
  clear() {
    try {
      localStorage.removeItem(CACHE_KEYS.CALENDARS);
      localStorage.removeItem(CACHE_KEYS.EVENTS);
      localStorage.removeItem(CACHE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },
};
