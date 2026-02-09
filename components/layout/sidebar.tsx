"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { ColorPicker } from "@/components/ui/color-picker";
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
  local: Monitor,
};

export function Sidebar({
  selectedDate, onDateSelect, calendarGroups, onToggleCalendar,
  onChangeCalendarColor, onAddAccount, isCollapsed, onToggleCollapsed,
  todos, todoLists, onToggleTodo, onAddTodo, onDeleteTodo, isMobile,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("calendars");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(calendarGroups.map((g) => g.id)));
  const [newTodoText, setNewTodoText] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Auto-expand new calendar groups
  useEffect(() => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      calendarGroups.forEach((g) => newSet.add(g.id));
      return newSet;
    });
  }, [calendarGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleAddTodo = useCallback(() => {
    if (newTodoText.trim()) { onAddTodo(newTodoText.trim()); setNewTodoText(""); }
  }, [newTodoText, onAddTodo]);

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  if (isCollapsed) {
    return (
      <div className="flex w-10 flex-col items-center gap-1.5 border-r border-border bg-sidebar-bg pt-2">
        <button onClick={onToggleCollapsed} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-5 bg-border" />
        <div className="px-1.5 py-1">
          <Image src="/icon.svg" alt="OpenCalendar" width={24} height={24} className="opacity-80" />
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
          <Image src="/icon.svg" alt="OpenCalendar" width={20} height={20} className="opacity-90" />
          <span className="font-pixel text-xs font-bold tracking-wider text-foreground">OpenCalendar</span>
        </div>
        <button onClick={onToggleCollapsed} className="touch-target rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <PanelLeftClose className={isMobile ? "h-5 w-5" : "h-3.5 w-3.5"} />
        </button>
      </div>

      <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />

      <div className="mx-2 flex items-center gap-0.5 rounded-md border border-border p-0.5">
        <button onClick={() => setActiveTab("calendars")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-sm py-1 text-[11px] font-medium ${activeTab === "calendars" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <CalendarDays className="h-3 w-3" /> Kalenders
        </button>
        <button onClick={() => setActiveTab("todos")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-sm py-1 text-[11px] font-medium ${activeTab === "todos" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <CheckSquare className="h-3 w-3" /> Taken
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
              const Icon = providerIcons[group.provider];
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
          <>
            <div className="mb-2 flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
              <Plus className="h-3 w-3 text-muted-foreground" />
              <input type="text" value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
                placeholder="Nieuwe taak..." className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-px">
              {incompleteTodos.length === 0 && (
                <div className="py-4 text-center text-[11px] text-muted-foreground">Geen openstaande taken</div>
              )}
              {incompleteTodos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />
              ))}
            </div>
            {completedTodos.length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                  {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Voltooid ({completedTodos.length})
                </button>
                {showCompleted && (
                  <div className="mt-1 space-y-px">
                    {completedTodos.map((todo) => (
                      <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function CalendarItem({ cal, onToggle, onChangeColor }: {
  cal: { id: string; name: string; color: string; isVisible: boolean };
  onToggle: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="group relative flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
      {/* Color indicator */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: cal.color }}
      />

      {/* Calendar name */}
      <span className={`flex-1 truncate ${cal.isVisible ? "text-foreground" : "text-muted-foreground line-through"}`}>
        {cal.name}
      </span>

      {/* Visibility toggle (Eye icon) */}
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

      {/* Color picker button */}
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
}

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={`group flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted ${todo.completed ? "opacity-50" : ""}`}>
      <button onClick={() => onToggle(todo.id)} className="mt-px shrink-0">
        <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
          todo.completed ? "border-foreground bg-foreground" : "border-muted-foreground/40 hover:border-foreground"
        }`}>
          {todo.completed && (
            <svg className="h-2 w-2 text-background" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
      <div className="min-w-0 flex-1">
        <span className={`text-xs leading-snug ${todo.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{todo.title}</span>
        {todo.dueDate && !todo.completed && (
          <div className="text-[10px] text-muted-foreground">{todo.dueDate.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</div>
        )}
      </div>
      <button onClick={() => onDelete(todo.id)}
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
