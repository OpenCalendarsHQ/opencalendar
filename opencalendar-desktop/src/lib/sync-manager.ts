import { apiClient } from "./api";
import { offlineCache } from "./offline-cache";

class SyncManager {
  private isSyncing = false;
  private syncInterval: number | null = null;

  /**
   * Start automatic sync checking every 30 seconds
   */
  startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      this.processSyncQueue();
    }, 30000); // Every 30 seconds

    // Also process immediately
    this.processSyncQueue();
  }

  /**
   * Stop automatic sync checking
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Process all items in the sync queue
   */
  async processSyncQueue() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    const queue = offlineCache.getSyncQueue();
    if (queue.length === 0) {
      offlineCache.setOfflineStatus(false);
      return;
    }

    console.log(`Processing ${queue.length} items in sync queue`);
    this.isSyncing = true;

    try {
      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          offlineCache.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);

          // Increment retry count
          const newRetries = item.retries + 1;

          // Remove if too many retries (max 5)
          if (newRetries > 5) {
            console.error(`Max retries reached for item ${item.id}, removing from queue`);
            offlineCache.removeFromSyncQueue(item.id);
          } else {
            offlineCache.updateSyncQueueItem(item.id, { retries: newRetries });
          }
        }
      }

      // Check if we're still offline
      const remainingQueue = offlineCache.getSyncQueue();
      offlineCache.setOfflineStatus(remainingQueue.length > 0);

      console.log('Sync queue processing complete');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processSyncItem(item: any) {
    console.log(`Syncing ${item.type} ${item.resource}:`, item.data);

    switch (item.resource) {
      case 'event':
        await this.syncEvent(item);
        break;
      case 'calendar':
        await this.syncCalendar(item);
        break;
      default:
        console.warn(`Unknown resource type: ${item.resource}`);
    }
  }

  /**
   * Sync event changes
   */
  private async syncEvent(item: any) {
    switch (item.type) {
      case 'create':
        await apiClient.createEvent(item.data);
        break;
      case 'update':
        await apiClient.updateEvent(item.data.id, item.data);
        break;
      case 'delete':
        await apiClient.deleteEvent(item.data.id);
        break;
    }
  }

  /**
   * Sync calendar changes
   */
  private async syncCalendar(item: any) {
    switch (item.type) {
      case 'create':
        await apiClient.createCalendar(item.data);
        break;
      case 'update':
        await apiClient.updateCalendar(item.data);
        break;
      case 'delete':
        await apiClient.deleteCalendarAccount(item.data.id);
        break;
    }
  }

  /**
   * Check if we're currently offline
   */
  isOffline(): boolean {
    return offlineCache.isOffline() || offlineCache.getSyncQueue().length > 0;
  }

  /**
   * Get pending sync count
   */
  getPendingSyncCount(): number {
    return offlineCache.getSyncQueue().length;
  }
}

export const syncManager = new SyncManager();
