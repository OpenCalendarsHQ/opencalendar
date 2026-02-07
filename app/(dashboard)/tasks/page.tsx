"use client";

import { useState, useCallback } from "react";
import { Plus, Search, CheckCircle2, Circle, Calendar, Trash2, Star, Inbox, User, Briefcase, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTodos } from "@/hooks/use-todos";
import type { Todo, TodoList } from "@/lib/types";

const LIST_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox, user: User, briefcase: Briefcase,
};

type FilterType = "all" | "today" | "upcoming" | "completed";

export default function TasksPage() {
  const { todos, lists, addTodo, toggleTodo, deleteTodo, updateTodo } = useTodos();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const filteredTodos = todos.filter((todo) => {
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedList && todo.listId !== selectedList) return false;
    switch (filter) {
      case "today": return !todo.completed && todo.dueDate?.toISOString().split("T")[0] === todayStr;
      case "upcoming": return !todo.completed && todo.dueDate && todo.dueDate > now;
      case "completed": return todo.completed;
      default: return !todo.completed;
    }
  });

  const handleAddTask = useCallback(() => {
    if (newTaskTitle.trim()) {
      addTodo(newTaskTitle.trim(), selectedList || "inbox", filter === "today" ? now : undefined);
      setNewTaskTitle("");
    }
  }, [newTaskTitle, addTodo, selectedList, filter, now]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="hidden w-56 shrink-0 border-r border-border bg-sidebar-bg p-3 lg:block">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <h1 className="text-sm font-medium text-foreground">Taken</h1>
        </div>

        <div className="mb-4 space-y-px">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weergave</div>
          {([
            { id: "all" as FilterType, label: "Alle taken", icon: Circle, count: todos.filter((t) => !t.completed).length },
            { id: "today" as FilterType, label: "Vandaag", icon: Star, count: todos.filter((t) => !t.completed && t.dueDate?.toISOString().split("T")[0] === todayStr).length },
            { id: "upcoming" as FilterType, label: "Aankomend", icon: Calendar, count: todos.filter((t) => !t.completed && t.dueDate && t.dueDate > now).length },
            { id: "completed" as FilterType, label: "Voltooid", icon: CheckCircle2, count: todos.filter((t) => t.completed).length },
          ]).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => { setFilter(item.id); setSelectedList(null); }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                  filter === item.id && !selectedList ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{item.label}</div>
                {item.count > 0 && <span className="text-[10px] text-muted-foreground">{item.count}</span>}
              </button>
            );
          })}
        </div>

        <div className="space-y-px">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Lijsten</div>
          {lists.map((list) => {
            const Icon = LIST_ICONS[list.icon] || Circle;
            const count = todos.filter((t) => !t.completed && t.listId === list.id).length;
            return (
              <button key={list.id} onClick={() => { setSelectedList(list.id); setFilter("all"); }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                  selectedList === list.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{list.name}</div>
                {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                {selectedList ? lists.find((l) => l.id === selectedList)?.name : filter === "today" ? "Vandaag" : filter === "upcoming" ? "Aankomend" : filter === "completed" ? "Voltooid" : "Alle taken"}
              </h2>
              <p className="text-xs text-muted-foreground">{filteredTodos.length} {filteredTodos.length === 1 ? "taak" : "taken"}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoeken..." className="w-28 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
          </div>

          {filter !== "completed" && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Nieuwe taak..."
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
              {newTaskTitle && (
                <button onClick={handleAddTask} className="rounded-md bg-foreground px-2.5 py-1 text-[10px] font-medium text-background">
                  Toevoegen
                </button>
              )}
            </div>
          )}

          <div className="space-y-px">
            {filteredTodos.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">{filter === "completed" ? "Nog geen voltooide taken" : "Geen taken"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Voeg een taak toe om te beginnen</p>
              </div>
            )}
            {filteredTodos.map((todo) => (
              <TaskRow key={todo.id} todo={todo} lists={lists} onToggle={toggleTodo} onDelete={deleteTodo} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ todo, lists, onToggle, onDelete }: { todo: Todo; lists: TodoList[]; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const list = lists.find((l) => l.id === todo.listId);
  return (
    <div className="group flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted">
      <button onClick={() => onToggle(todo.id)} className="shrink-0">
        <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
          todo.completed ? "border-foreground bg-foreground" : "border-muted-foreground/40 hover:border-foreground"
        }`}>
          {todo.completed && (
            <svg className="h-2.5 w-2.5 text-background" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-xs ${todo.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{todo.title}</div>
        <div className="mt-px flex items-center gap-2 text-[10px] text-muted-foreground">
          {list && <span>{list.name}</span>}
          {todo.dueDate && <span>{todo.dueDate.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(todo.id)}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
