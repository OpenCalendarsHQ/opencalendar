"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
  RefreshCw,
  Menu,
} from "lucide-react";
import { UserButtonWrapper } from "./user-button-wrapper";
import { formatMonthYear, formatTodayDate } from "@/lib/utils/date";
import type { CalendarViewType } from "@/lib/types";
import Link from "next/link";

interface HeaderProps {
  currentDate: Date;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateToday: () => void;
  onCreateEvent: () => void;
  onOpenSearch: () => void;
  onSync?: () => Promise<void>;
  isMobile?: boolean;
  onToggleMobileSidebar?: () => void;
}

export function Header({
  currentDate,
  viewType,
  onViewTypeChange,
  onNavigateBack,
  onNavigateForward,
  onNavigateToday,
  onCreateEvent,
  onOpenSearch,
  onSync,
  isMobile,
  onToggleMobileSidebar,
}: HeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Auto-sync every minute
  useEffect(() => {
    const syncData = async () => {
      if (onSync && !isSyncing) {
        setIsSyncing(true);
        try {
          await onSync();
          setLastSyncTime(new Date());
        } catch (error) {
          console.error("Auto-sync failed:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    // Initial sync
    syncData();

    // Sync every 60 seconds
    const interval = setInterval(syncData, 60000);

    return () => clearInterval(interval);
  }, [onSync]);

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

  // Mobile header layout
  if (isMobile) {
    return (
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2 safe-left safe-right">
        {/* Left: Menu + Date */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMobileSidebar}
            className="touch-target rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Menu openen"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-medium capitalize text-foreground">
              {formatMonthYear(currentDate)}
            </span>
            <span className="text-[10px] capitalize text-muted-foreground">
              {formatTodayDate(new Date())}
            </span>
          </div>
        </div>

        {/* Center: Navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={onNavigateBack}
            className="touch-target rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onNavigateToday}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            Vandaag
          </button>
          <button
            onClick={onNavigateForward}
            className="touch-target rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Create + More */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onCreateEvent}
            className="touch-target rounded-md bg-accent p-2 text-accent-foreground hover:bg-accent-hover"
            aria-label="Nieuw evenement"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={onOpenSearch}
            className="touch-target rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Zoeken"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>
    );
  }

  // Desktop header layout
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
      {/* Left: Date + Sync Status */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium capitalize text-foreground">
            {formatMonthYear(currentDate)}
          </span>
          <span className="text-[10px] capitalize text-muted-foreground">
            {formatTodayDate(new Date())}
          </span>
        </div>

        {onSync && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            title={lastSyncTime ? `Laatst gesynchroniseerd: ${lastSyncTime.toLocaleTimeString()}` : "Synchroniseren"}
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Bezig..." : "Sync"}</span>
          </button>
        )}
      </div>

      {/* Center: Navigation + View Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNavigateToday}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          Vandaag
        </button>

        <div className="flex items-center rounded-md border border-border">
          <button onClick={onNavigateBack} className="rounded-l-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNavigateForward} className="rounded-r-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <select
          value={viewType}
          onChange={(e) => onViewTypeChange(e.target.value as CalendarViewType)}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          <option value="day">Dag</option>
          <option value="week">Week</option>
          <option value="month">Maand</option>
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onCreateEvent}
          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Nieuw
        </button>
        <button onClick={onOpenSearch} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Zoeken (⌘K)">
          <Search className="h-4 w-4" />
        </button>
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Instellingen">
          <Settings className="h-4 w-4" />
        </Link>
        <div className="ml-1">
          <UserButtonWrapper />
        </div>
      </div>
    </header>
  );
}
