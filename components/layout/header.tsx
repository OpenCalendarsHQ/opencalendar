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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Header");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Auto-sync every 5 minutes when tab is visible - only if we have a sync function
  useEffect(() => {
    if (!onSync) return;
    
    const syncData = async () => {
      // Only sync if tab is visible and not already syncing
      if (isSyncing || document.hidden) return;
      
      setIsSyncing(true);
      try {
        await onSync();
        setLastSyncTime(new Date());
      } catch (error) {
        console.error("Auto-sync failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Sync every 5 minutes (300000ms)
    const interval = setInterval(syncData, 300000);

    // Listen for visibility changes to pause/resume sync
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, sync after a short delay
        setTimeout(syncData, 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
      <header className="shrink-0 border-b border-border">
        {/* Top row */}
        <div className="flex h-14 items-center justify-between px-2 safe-left safe-right">
          {/* Left: Menu + Date with month nav */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleMobileSidebar}
              className="flex min-w-[36px] min-h-[36px] items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Menu openen"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onNavigateBack}
                className="flex min-w-[28px] min-h-[28px] items-center justify-center rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Vorige"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-[100px] flex-col items-center px-1">
                <span className="font-pixel text-sm font-bold capitalize text-foreground leading-tight">
                  {formatMonthYear(currentDate)}
                </span>
                <span className="text-[10px] capitalize text-muted-foreground">
                  {formatTodayDate(new Date())}
                </span>
              </div>
              <button
                onClick={onNavigateForward}
                className="flex min-w-[28px] min-h-[28px] items-center justify-center rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Volgende"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right: Sync + Create + Search - compact on mobile */}
          <div className="flex items-center gap-0.5">
            {onSync && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex min-w-[36px] min-h-[36px] items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label={isSyncing ? "Synchroniseren..." : "Synchroniseren"}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={onCreateEvent}
              className="flex min-w-[36px] min-h-[36px] items-center justify-center rounded-md bg-accent p-1.5 text-accent-foreground hover:bg-accent-hover"
              aria-label="Nieuw evenement"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenSearch}
              className="flex min-w-[36px] min-h-[36px] items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zoeken"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom row: Today + View selector */}
        <div className="flex items-center justify-between border-t border-border-light px-2 py-1.5">
          <button
            onClick={onNavigateToday}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
          >
            {t("today")}
          </button>

          {/* View selector */}
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <button
              onClick={() => onViewTypeChange("day")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                viewType === "day"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              D
            </button>
            <button
              onClick={() => onViewTypeChange("week")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                viewType === "week"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              W
            </button>
            <button
              onClick={() => onViewTypeChange("month")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                viewType === "month"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              M
            </button>
            <button
              onClick={() => onViewTypeChange("year")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                viewType === "year"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              J
            </button>
          </div>
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
          <span className="font-pixel text-sm font-bold capitalize text-foreground">
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
            title={lastSyncTime ? `Laatst gesynchroniseerd: ${lastSyncTime.toLocaleTimeString()}` : t("sync")}
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="w-10 text-center">{isSyncing ? "..." : t("sync")}</span>
          </button>
        )}
      </div>

      {/* Center: Navigation + View Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNavigateToday}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          {t("today")}
        </button>

        <div className="flex items-center rounded-md border border-border">
          <button onClick={onNavigateBack} className="rounded-l-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNavigateForward} className="rounded-r-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <button
            onClick={() => onViewTypeChange("day")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewType === "day"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("views.day")}
          </button>
          <button
            onClick={() => onViewTypeChange("week")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewType === "week"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("views.week")}
          </button>
          <button
            onClick={() => onViewTypeChange("month")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewType === "month"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("views.month")}
          </button>
          <button
            onClick={() => onViewTypeChange("year")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewType === "year"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Jaar
          </button>
        </div>
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
