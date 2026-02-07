"use client";

import { useState, useCallback } from "react";

interface SyncStatus {
  accountId: string;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
}

export function useSync() {
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(
    new Map()
  );

  const syncGoogleAccount = useCallback(async (accountId: string) => {
    setSyncStatuses((prev) => {
      const next = new Map(prev);
      next.set(accountId, {
        accountId,
        isSyncing: true,
        lastSyncAt: prev.get(accountId)?.lastSyncAt || null,
        error: null,
      });
      return next;
    });

    try {
      const response = await fetch(
        `/api/sync/google?accountId=${accountId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Google sync mislukt");
      }

      const data = await response.json();

      setSyncStatuses((prev) => {
        const next = new Map(prev);
        next.set(accountId, {
          accountId,
          isSyncing: false,
          lastSyncAt: new Date(),
          error: data.warnings?.length ? data.warnings.join(", ") : null,
        });
        return next;
      });

      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Onbekende fout";

      setSyncStatuses((prev) => {
        const next = new Map(prev);
        next.set(accountId, {
          accountId,
          isSyncing: false,
          lastSyncAt: prev.get(accountId)?.lastSyncAt || null,
          error: message,
        });
        return next;
      });

      throw error;
    }
  }, []);

  const syncICloudAccount = useCallback(async (accountId: string) => {
    setSyncStatuses((prev) => {
      const next = new Map(prev);
      next.set(accountId, {
        accountId,
        isSyncing: true,
        lastSyncAt: prev.get(accountId)?.lastSyncAt || null,
        error: null,
      });
      return next;
    });

    try {
      const response = await fetch("/api/sync/icloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", accountId }),
      });

      if (!response.ok) {
        throw new Error("iCloud sync mislukt");
      }

      const data = await response.json();

      setSyncStatuses((prev) => {
        const next = new Map(prev);
        next.set(accountId, {
          accountId,
          isSyncing: false,
          lastSyncAt: new Date(),
          error: data.errors?.length ? data.errors.join(", ") : null,
        });
        return next;
      });

      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Onbekende fout";

      setSyncStatuses((prev) => {
        const next = new Map(prev);
        next.set(accountId, {
          accountId,
          isSyncing: false,
          lastSyncAt: prev.get(accountId)?.lastSyncAt || null,
          error: message,
        });
        return next;
      });

      throw error;
    }
  }, []);

  const getSyncStatus = useCallback(
    (accountId: string): SyncStatus => {
      return (
        syncStatuses.get(accountId) || {
          accountId,
          isSyncing: false,
          lastSyncAt: null,
          error: null,
        }
      );
    },
    [syncStatuses]
  );

  const isAnySyncing = Array.from(syncStatuses.values()).some(
    (s) => s.isSyncing
  );

  return {
    syncStatuses,
    syncGoogleAccount,
    syncICloudAccount,
    getSyncStatus,
    isAnySyncing,
  };
}
