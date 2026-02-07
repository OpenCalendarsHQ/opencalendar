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
      <div className="flex items-center gap-2">
        <button
          onClick={onNavigateToday}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          Vandaag
        </button>

        <div className="flex items-center">
          <button onClick={onNavigateBack} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNavigateForward} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <span className="text-sm font-medium capitalize text-foreground">
          {formatMonthYear(currentDate)}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        {(["day", "week", "month"] as const).map((type) => (
          <button
            key={type}
            onClick={() => onViewTypeChange(type)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              viewType === type
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {type === "day" ? "Dag" : type === "week" ? "Week" : "Maand"}
          </button>
        ))}
      </div>

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
          <UserButton />
        </div>
      </div>
    </header>
  );
}
