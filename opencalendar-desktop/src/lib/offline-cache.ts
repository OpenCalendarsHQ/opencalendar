/**
 * Simple offline cache using localStorage
 * Stores calendars and events locally for offline access
 */

const CACHE_KEYS = {
  CALENDARS: 'offline_calendars',
  EVENTS: 'offline_events',
  LAST_SYNC: 'offline_last_sync',
  SYNC_QUEUE: 'offline_sync_queue',
  IS_OFFLINE: 'offline_is_offline',
};

const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'event' | 'calendar';
  data: any;
  timestamp: number;
  retries: number;
}

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
      localStorage.removeItem(CACHE_KEYS.SYNC_QUEUE);
      localStorage.removeItem(CACHE_KEYS.IS_OFFLINE);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },

  // Offline status
  setOfflineStatus(isOffline: boolean) {
    try {
      localStorage.setItem(CACHE_KEYS.IS_OFFLINE, JSON.stringify(isOffline));
    } catch (error) {
      console.error('Failed to set offline status:', error);
    }
  },

  isOffline(): boolean {
    try {
      const data = localStorage.getItem(CACHE_KEYS.IS_OFFLINE);
      return data ? JSON.parse(data) : false;
    } catch (error) {
      return false;
    }
  },

  // Sync queue management
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) {
    try {
      const queue = this.getSyncQueue();
      const newItem: SyncQueueItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retries: 0,
      };
      queue.push(newItem);
      localStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      console.log('Added to sync queue:', newItem);
      return newItem.id;
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      return null;
    }
  },

  getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(CACHE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  },

  removeFromSyncQueue(itemId: string) {
    try {
      const queue = this.getSyncQueue();
      const filtered = queue.filter(item => item.id !== itemId);
      localStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
      console.log('Removed from sync queue:', itemId);
    } catch (error) {
      console.error('Failed to remove from sync queue:', error);
    }
  },

  updateSyncQueueItem(itemId: string, updates: Partial<SyncQueueItem>) {
    try {
      const queue = this.getSyncQueue();
      const updated = queue.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      localStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update sync queue item:', error);
    }
  },

  clearSyncQueue() {
    try {
      localStorage.removeItem(CACHE_KEYS.SYNC_QUEUE);
      console.log('Sync queue cleared');
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  },

  // Update cached event locally (for optimistic updates)
  updateCachedEvent(eventId: string, updates: any) {
    try {
      const events = this.getEvents() || [];
      const updated = events.map(event =>
        event.id === eventId ? { ...event, ...updates } : event
      );
      this.saveEvents(updated);
    } catch (error) {
      console.error('Failed to update cached event:', error);
    }
  },

  addCachedEvent(event: any) {
    try {
      const events = this.getEvents() || [];
      events.push(event);
      this.saveEvents(events);
    } catch (error) {
      console.error('Failed to add cached event:', error);
    }
  },

  removeCachedEvent(eventId: string) {
    try {
      const events = this.getEvents() || [];
      const filtered = events.filter(event => event.id !== eventId);
      this.saveEvents(filtered);
    } catch (error) {
      console.error('Failed to remove cached event:', error);
    }
  },
};
