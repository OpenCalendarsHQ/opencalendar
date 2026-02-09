"use client";

import { CalendarDays, Calendar, LayoutGrid, CheckSquare, Settings, CalendarRange } from "lucide-react";
import type { CalendarViewType } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
}

export function MobileNav({ viewType, onViewTypeChange }: MobileNavProps) {
  const pathname = usePathname();

  const isCalendar = pathname === "/" || pathname === "" || pathname === "/dashboard";
  const isTasks = pathname === "/dashboard/tasks";
  const isToday = pathname === "/dashboard/today";
  const isSettings = pathname?.startsWith("/settings");

  return (
    <nav className="flex h-14 shrink-0 items-center justify-around border-t border-border bg-background safe-bottom safe-left safe-right">
      <Link
        href="/dashboard"
        className={`flex flex-col items-center gap-0.5 px-6 py-1 ${
          isCalendar ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <Calendar className="h-5 w-5" />
        <span className="text-[10px] font-medium">Kalender</span>
      </Link>

      <Link
        href="/dashboard/tasks"
        className={`flex flex-col items-center gap-0.5 px-6 py-1 ${
          isTasks ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <CheckSquare className="h-5 w-5" />
        <span className="text-[10px] font-medium">Taken</span>
      </Link>

      <Link
        href="/settings"
        className={`flex flex-col items-center gap-0.5 px-6 py-1 ${
          isSettings ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <Settings className="h-5 w-5" />
        <span className="text-[10px] font-medium">Instellingen</span>
      </Link>
    </nav>
  );
}
