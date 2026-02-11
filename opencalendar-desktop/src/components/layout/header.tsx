import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { formatMonthYear, formatTodayDate } from "../../lib/utils/date";
import type { CalendarViewType } from "../../lib/types";

interface HeaderProps {
  currentDate: Date;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateToday: () => void;
  onCreateEvent?: () => void;
  onSync?: () => Promise<void>;
}

export function Header({
  currentDate,
  viewType,
  onViewTypeChange,
  onNavigateBack,
  onNavigateForward,
  onNavigateToday,
  onCreateEvent,
  onSync,
}: HeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const lastSyncRef = useRef<number>(0);

  // Auto-sync every few minutes when window is focused
  useEffect(() => {
    const syncData = async (force = false) => {
      const now = Date.now();
      const throttleMs = viewType === "month" ? 120000 : 30000; // 2 min for month, 30s for others

      // Only sync if onSync is provided and not already syncing
      // and if it's been long enough since the last sync (unless forced)
      if (onSync && !isSyncing && (force || now - lastSyncRef.current > throttleMs) && document.hasFocus()) {
        setIsSyncing(true);
        try {
          await onSync();
          setLastSyncTime(new Date());
          lastSyncRef.current = Date.now();
        } catch (error) {
          console.error("Auto-sync failed:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    // Initial sync check
    syncData();

    // Sync interval (check every 30 seconds)
    const interval = setInterval(() => syncData(), 30000);

    // Listen for focus events to sync when window regains focus
    const handleFocus = () => {
      // Small delay to let focus stabilize
      setTimeout(() => syncData(), 1000);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [onSync, viewType]); // Removed isSyncing from deps to avoid loop

  const handleManualSync = async () => {
    if (onSync && !isSyncing) {
      setIsSyncing(true);
      try {
        await onSync();
        setLastSyncTime(new Date());
      } catch (error) {
        console.error("Manual sync failed:", error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-(--breakpoint-2xl) items-center justify-between px-4">
        {/* Left: Date + Sync Status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium capitalize text-gray-900">
              {formatMonthYear(currentDate)}
            </span>
            <span className="text-[10px] capitalize text-gray-600">
              {formatTodayDate(new Date())}
            </span>
          </div>

          {onSync && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              title={lastSyncTime ? `Laatst gesynchroniseerd: ${lastSyncTime.toLocaleTimeString()}` : "Synchroniseren"}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="w-8 inline-block text-left">{isSyncing ? "..." : "Sync"}</span>
            </button>
          )}
        </div>

        {/* Center: Navigation + View Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToday}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50"
          >
            Vandaag
          </button>

          <div className="flex items-center rounded-md border border-gray-300">
            <button onClick={onNavigateBack} className="rounded-l-md p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={onNavigateForward} className="rounded-r-md p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 rounded-md border border-gray-300 p-0.5">
            <button
              onClick={() => onViewTypeChange("day")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewType === "day"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Dag
            </button>
            <button
              onClick={() => onViewTypeChange("week")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewType === "week"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => onViewTypeChange("month")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewType === "month"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Maand
            </button>
            <button
              onClick={() => onViewTypeChange("year")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewType === "year"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Jaar
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {onCreateEvent && (
            <button
              onClick={onCreateEvent}
              className="flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
