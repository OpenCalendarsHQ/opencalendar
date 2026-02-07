"use client";

import { CalendarDays, Calendar, LayoutGrid, CheckSquare, Settings } from "lucide-react";
import type { CalendarViewType } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
}

export function MobileNav({ viewType, onViewTypeChange }: MobileNavProps) {
  const pathname = usePathname();

  const isCalendar = pathname === "/" || pathname === "";
  const isTasks = pathname === "/tasks";
  const isToday = pathname === "/today";
  const isSettings = pathname?.startsWith("/settings");

  return (
    <nav className="flex h-14 shrink-0 items-center justify-around border-t border-border bg-background safe-bottom safe-left safe-right">
      {/* View type buttons when on calendar */}
      {isCalendar ? (
        <>
          <button
            onClick={() => onViewTypeChange("day")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              viewType === "day" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[10px] font-medium">Dag</span>
          </button>
          <button
            onClick={() => onViewTypeChange("week")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              viewType === "week" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium">Week</span>
          </button>
          <button
            onClick={() => onViewTypeChange("month")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              viewType === "month" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] font-medium">Maand</span>
          </button>
        </>
      ) : (
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] font-medium">Kalender</span>
        </Link>
      )}

      <Link
        href="/tasks"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          isTasks ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <CheckSquare className="h-5 w-5" />
        <span className="text-[10px] font-medium">Taken</span>
      </Link>

      <Link
        href="/settings"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          isSettings ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <Settings className="h-5 w-5" />
        <span className="text-[10px] font-medium">Instellingen</span>
      </Link>
    </nav>
  );
}
