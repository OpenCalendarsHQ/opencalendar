import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { MiniCalendar } from "../calendar/mini-calendar";
import type { CalendarGroup } from "../../lib/types";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00a4ef" />
    </svg>
  );
}

function CalDAVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
  );
}

interface SidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  calendarGroups: CalendarGroup[];
  onToggleCalendar: (calendarId: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  weekStartsOn?: 0 | 1;
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  google: GoogleIcon,
  icloud: AppleIcon,
  microsoft: MicrosoftIcon,
  caldav: CalDAVIcon,
  local: Monitor,
};

export function Sidebar({
  selectedDate, onDateSelect, calendarGroups, onToggleCalendar,
  isCollapsed, onToggleCollapsed, weekStartsOn = 1,
}: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(calendarGroups.map((g) => g.id)));

  // Auto-expand new calendar groups
  useEffect(() => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      calendarGroups.forEach((g) => newSet.add(g.id));
      return newSet;
    });
  }, [calendarGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapsed}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-2"
          title="Sidebar openen"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Kalenders</h2>
        <button
          onClick={onToggleCollapsed}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-1"
          title="Sidebar sluiten"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="border-b border-gray-200 dark:border-gray-700 py-2">
        <MiniCalendar
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          weekStartsOn={weekStartsOn}
        />
      </div>

      {/* Calendar Groups */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-2">
          {calendarGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const ProviderIcon = providerIcons[group.provider] || Monitor;

            return (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 text-sm"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                  <ProviderIcon className="h-4 w-4 text-gray-600" />
                  <span className="flex-1 text-left font-medium text-gray-900 truncate">
                    {group.email}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {group.calendars.map((calendar) => (
                      <div
                        key={calendar.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 group"
                      >
                        <button
                          onClick={() => onToggleCalendar(calendar.id)}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          {calendar.isVisible ? (
                            <Eye className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <div
                            className="h-3 w-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: calendar.color }}
                          />
                          <span className="text-sm text-gray-900 truncate">
                            {calendar.name}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
