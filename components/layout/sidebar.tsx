"use client";

import { useState, useCallback, useEffect, memo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  CalendarDays,
  CheckSquare,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Apple,
  Terminal,
  Laptop,
  X,
} from "lucide-react";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { ColorPicker } from "@/components/ui/color-picker";
import { TaskList } from "@/components/tasks/task-list";
import type { CalendarGroup, Todo, TodoList, SidebarTab } from "@/lib/types";

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

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.537 1.537 1.168 2.069.63.532 1.458.811 2.342.811.36 0 .724-.052 1.076-.157.652-.195 1.245-.566 1.707-1.074.463.508 1.055.879 1.707 1.074.352.105.716.157 1.076.157.884 0 1.712-.279 2.342-.811.631-.532 1.051-1.29 1.168-2.069.123-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021zm-1.5 1.5c.052 0 .105.002.158.006 3.645.285 2.747 4.307 2.812 5.511.085 1.573.376 2.622 1.232 3.836.82 1.164 1.972 2.762 2.511 4.382.227.678.329 1.382.237 2.025-.082.59-.386 1.152-.855 1.549-.47.397-1.082.596-1.695.596-.264 0-.53-.038-.786-.114-.507-.151-.962-.452-1.314-.819-.352.367-.807.668-1.314.819-.256.076-.522.114-.786.114-.613 0-1.225-.199-1.695-.596-.469-.397-.773-.959-.855-1.549-.092-.643.01-1.347.237-2.025.539-1.62 1.691-3.218 2.511-4.382.856-1.214 1.147-2.263 1.232-3.836.065-1.204-.833-5.226 2.812-5.511.053-.004.106-.006.158-.006zm-.75 3.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm3 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm-7.5 6c-.414 0-.75.336-.75.75s.336.75.75.75.75-.336.75-.75-.336-.75-.75-.75zm12 0c-.414 0-.75.336-.75.75s.336.75.75.75.75-.336.75-.75-.336-.75-.75-.75z"/>
    </svg>
  );
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface SidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  calendarGroups: CalendarGroup[];
  onToggleCalendar: (calendarId: string) => void;
  onChangeCalendarColor: (calendarId: string, color: string) => void;
  onAddAccount: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  todos: Todo[];
  todoLists: TodoList[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (title: string, listId?: string) => void;
  onDeleteTodo: (id: string) => void;
  isMobile?: boolean;
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  google: GoogleIcon,
  icloud: AppleIcon,
  microsoft: MicrosoftIcon,
  caldav: CalDAVIcon,
  local: Monitor,
};

const CalendarItem = memo(function CalendarItem({ cal, onToggle, onChangeColor }: {
  cal: { id: string; name: string; color: string; isVisible: boolean };
  onToggle: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="group relative flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: cal.color }}
      />
      <span className={`flex-1 truncate ${cal.isVisible ? "text-foreground" : "text-muted-foreground line-through"}`}>
        {cal.name}
      </span>
      <button
        onClick={() => onToggle(cal.id)}
        className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent"
        title={cal.isVisible ? "Verberg kalender" : "Toon kalender"}
      >
        {cal.isVisible ? (
          <Eye className="h-3 w-3 text-muted-foreground" />
        ) : (
          <EyeOff className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
        className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent"
        title="Wijzig kleur"
      >
        <div className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: cal.color }} />
      </button>

      {showPicker && (
        <div className="absolute right-0 top-full z-50 mt-1">
          <ColorPicker
            value={cal.color}
            onChange={(color) => onChangeColor(cal.id, color)}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </div>
  );
});

export function Sidebar({
  selectedDate, onDateSelect, calendarGroups, onToggleCalendar,
  onChangeCalendarColor, onAddAccount, isCollapsed, onToggleCollapsed,
  todos, todoLists, onToggleTodo, onAddTodo, onDeleteTodo, isMobile,
}: SidebarProps) {
  const t = useTranslations("Sidebar");
  const wt = useTranslations("Welcome");
  const [activeTab, setActiveTab] = useState<SidebarTab>("calendars");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(calendarGroups.map((g) => g.id)));
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(false);

  // Auto-expand new calendar groups
  useEffect(() => {
    if (calendarGroups.length > 0) {
      setExpandedGroups((prev) => {
        const newSet = new Set(prev);
        let changed = false;
        calendarGroups.forEach((g) => {
          if (!newSet.has(g.id)) {
            newSet.add(g.id);
            changed = true;
          }
        });
        return changed ? newSet : prev;
      });
    }
  }, [calendarGroups]);

  // Fetch release when modal opens
  useEffect(() => {
    if (showDesktopModal && !release && !loadingRelease) {
      setLoadingRelease(true);
      fetch("/api/releases")
        .then((res) => res.json())
        .then((data) => setRelease(data))
        .catch(() => {})
        .finally(() => setLoadingRelease(false));
    }
  }, [showDesktopModal, release, loadingRelease]);

  const getAsset = (ext: string) =>
    release?.assets.find((a) => a.name.toLowerCase().endsWith(ext.toLowerCase()));

  const formatSize = (bytes: number) =>
    (bytes / (1024 * 1024)).toFixed(1) + " MB";

  const winAsset = getAsset(".msi");
  const macAsset = getAsset(".dmg");
  const linuxAsset = getAsset(".appimage");

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const incompleteTodos = todos.filter((t) => !t.completed);

  if (isCollapsed) {
    return (
      <div className="flex w-10 flex-col items-center gap-1.5 border-r border-border bg-sidebar-bg pt-2">
        <button onClick={onToggleCollapsed} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-5 bg-border" />
        <div className="px-1.5 py-1">
          <Image src="/icon.svg" alt="OpenCalendars" width={24} height={24} className="opacity-80" />
        </div>
        <div className="h-px w-5 bg-border" />
        <button onClick={() => { onToggleCollapsed(); setActiveTab("calendars"); }}
          className={`rounded-md p-1.5 ${activeTab === "calendars" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <CalendarDays className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { onToggleCollapsed(); setActiveTab("todos"); }}
          className={`relative rounded-md p-1.5 ${activeTab === "todos" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <CheckSquare className="h-3.5 w-3.5" />
          {incompleteTodos.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
              {incompleteTodos.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside className={`flex flex-col border-r border-border bg-sidebar-bg ${isMobile ? "h-full w-full" : "w-64"}`}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="OpenCalendars" width={20} height={20} className="opacity-90" />
          <span className="font-pixel text-xs font-bold tracking-wider text-foreground uppercase">OPENCALENDARS</span>
        </div>
        <button onClick={onToggleCollapsed} className="touch-target rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <PanelLeftClose className={isMobile ? "h-5 w-5" : "h-3.5 w-3.5"} />
        </button>
      </div>

      <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />

      <div className="mx-2 flex items-center gap-0.5 rounded-md border border-border p-0.5">
        <button onClick={() => setActiveTab("calendars")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-sm py-1 text-[11px] font-medium ${activeTab === "calendars" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <CalendarDays className="h-3 w-3" /> {t("myCalendars")}
        </button>
        <button onClick={() => setActiveTab("todos")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-sm py-1 text-[11px] font-medium ${activeTab === "todos" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <CheckSquare className="h-3 w-3" /> {t("tasks")}
          {incompleteTodos.length > 0 && (
            <span className="ml-0.5 text-[9px] text-muted-foreground">{incompleteTodos.length}</span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {activeTab === "calendars" ? (
          <>
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Kalenders</span>
              <button onClick={onAddAccount} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {calendarGroups.map((group) => {
              const Icon = providerIcons[group.provider] || Monitor;
              const isExpanded = expandedGroups.has(group.id);
              return (
                <div key={group.id} className="mb-0.5">
                  <button onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted">
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate font-medium text-foreground">{group.email}</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-px">
                      {group.calendars.map((cal) => (
                        <CalendarItem key={cal.id} cal={cal} onToggle={onToggleCalendar} onChangeColor={onChangeCalendarColor} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <TaskList />
        )}
      </div>

      {/* Desktop App Section */}
      <div className="border-t border-border px-3 py-2">
        <button 
          onClick={() => setShowDesktopModal(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Laptop className="h-3.5 w-3.5" />
          <span className="font-medium">Desktop app</span>
        </button>
      </div>

      {/* Desktop Download Modal */}
      {showDesktopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-border bg-popover p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">{wt("download.title")}</h3>
              <button onClick={() => setShowDesktopModal(false)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">{wt("download.subtitle")}</p>
            
            <div className="space-y-2">
              {loadingRelease ? (
                <div className="py-4 text-center text-xs text-muted-foreground">Laden...</div>
              ) : (
                <>
                  {/* Windows */}
                  {winAsset ? (
                    <a href={winAsset.browser_download_url} 
                       className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-accent">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                        <WindowsIcon className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">Windows</div>
                        <div className="text-[10px] text-muted-foreground">{formatSize(winAsset.size)}</div>
                      </div>
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 p-2 opacity-50">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <WindowsIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">Windows</div>
                        <div className="text-[10px] text-muted-foreground">{wt("download.comingSoon")}</div>
                      </div>
                    </div>
                  )}

                  {/* macOS */}
                  {macAsset ? (
                    <a href={macAsset.browser_download_url}
                       className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-accent">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                        <AppleIcon className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">macOS</div>
                        <div className="text-[10px] text-muted-foreground">{formatSize(macAsset.size)}</div>
                      </div>
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 p-2 opacity-50">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <AppleIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">macOS</div>
                        <div className="text-[10px] text-muted-foreground">{wt("download.comingSoon")}</div>
                      </div>
                    </div>
                  )}

                  {/* Linux */}
                  {linuxAsset ? (
                    <a href={linuxAsset.browser_download_url}
                       className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-accent">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-500/10">
                        <LinuxIcon className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">Linux</div>
                        <div className="text-[10px] text-muted-foreground">{formatSize(linuxAsset.size)}</div>
                      </div>
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 p-2 opacity-50">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <LinuxIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">Linux</div>
                        <div className="text-[10px] text-muted-foreground">{wt("download.comingSoon")}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {release && (
              <p className="mt-3 text-[10px] text-muted-foreground">
                {wt("download.version")}: {release.tag_name}
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
