"use client";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { UserButton } from "@neondatabase/auth/react";
import { formatMonthYear } from "@/lib/utils/date";
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
}: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
      {/* Left: Date */}
      <div className="flex items-center">
        <span className="text-sm font-medium capitalize text-foreground">
          {formatMonthYear(currentDate)}
        </span>
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
          <UserButton size="icon" />
        </div>
      </div>
    </header>
  );
}
