"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Trash2,
  Calendar,
  LayoutGrid,
  List,
  X,
  ChevronRight,
  GripVertical
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Task {
  id: string;
  providerId: string;
  providerName: string;
  providerType: "notion" | "github" | "manual";
  externalId: string | null;
  externalUrl: string | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  labels?: string[];
  scheduledEventId?: string;
  scheduledAt?: string;
  completedAt?: string;
  // Extra field for internal board state if needed
  boardStatus?: ColumnId;
}

type ColumnId = "todo" | "in_progress" | "done" | "blocked";

const STATUS_MAP: Record<string, ColumnId> = {
  "not started": "todo",
  "todo": "todo",
  "to-do": "todo",
  "te doen": "todo",
  "in progress": "in_progress",
  "doing": "in_progress",
  "bezig": "in_progress",
  "onderweg": "in_progress",
  "in uitvoering": "in_progress",
  "active": "in_progress",
  "started": "in_progress",
  "blocked": "blocked",
  "stuck": "blocked",
  "geblokkeerd": "blocked",
  "wachtend": "blocked",
  "on hold": "blocked",
  "done": "done",
  "closed": "done",
  "completed": "done",
  "gereed": "done",
  "voltooid": "done",
  "klaar": "done",
  "finished": "done"
};

// Fallback when we don't have provider-specific options
const COLUMN_TO_STATUS: Record<ColumnId, string> = {
  todo: "Not started",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked"
};

function mapColumnToNotionStatus(columnId: ColumnId, options: string[]): string {
  const lower = (s: string) => s.toLowerCase();
  const opts = options.map((o) => ({ original: o, lower: lower(o) }));
  if (columnId === "todo") {
    const m = opts.find((o) => /not started|todo|to-do|te doen|to do/.test(o.lower));
    return m?.original ?? opts[0]?.original ?? COLUMN_TO_STATUS.todo;
  }
  if (columnId === "in_progress") {
    const m = opts.find((o) => /in progress|bezig|doing|active|started|onderweg|in uitvoering/.test(o.lower));
    return m?.original ?? opts[1]?.original ?? opts[0]?.original ?? COLUMN_TO_STATUS.in_progress;
  }
  if (columnId === "blocked") {
    const m = opts.find((o) => /blocked|geblokkeerd|stuck|wachtend|on hold/.test(o.lower));
    return m?.original ?? COLUMN_TO_STATUS.blocked;
  }
  // done
  const m = opts.find((o) => /done|completed|gereed|voltooid|klaar|closed|finished/.test(o.lower));
  return m?.original ?? opts[opts.length - 1]?.original ?? COLUMN_TO_STATUS.done;
}

export function TaskBoard() {
  const t = useTranslations("Tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notionStatusOptions, setNotionStatusOptions] = useState<Record<string, string[]>>({});

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tasks?includeCompleted=true");
      if (response.ok) {
        const data = await response.json();
        const taskList = data.tasks || [];
        setTasks(taskList);
        // Fetch Notion status options for each unique provider
        const notionProviders = [...new Set(
          taskList.filter((t: Task) => t.providerType === "notion").map((t: Task) => t.providerId)
        )];
        for (const pid of notionProviders) {
          try {
            const res = await fetch(`/api/tasks/notion/status-options?providerId=${pid}`);
            if (res.ok) {
              const { options } = await res.json();
              setNotionStatusOptions((prev) => ({ ...prev, [String(pid)]: options }));
            }
          } catch (e) {
            console.error("Failed to fetch Notion status options:", e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const columns: { id: ColumnId; label: string; icon: any; color: string }[] = [
    { id: "todo", label: t("columns.todo"), icon: Circle, color: "text-blue-500" },
    { id: "in_progress", label: t("columns.inProgress"), icon: Clock, color: "text-amber-500" },
    { id: "done", label: t("columns.done"), icon: CheckCircle2, color: "text-emerald-500" },
    { id: "blocked", label: t("columns.blocked"), icon: AlertCircle, color: "text-rose-500" },
  ];

  function getTaskStatus(task: Task): ColumnId {
    if (task.completedAt) return "done";
    const status = (task.status || "").toLowerCase();
    return STATUS_MAP[status] || "todo";
  }

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const statusStr = typeof newStatus === "string" ? newStatus : String(newStatus ?? "");
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            status: statusStr, 
            completedAt: ["done", "completed", "gereed", "voltooid"].includes(statusStr.toLowerCase()) 
              ? new Date().toISOString() 
              : undefined 
          } 
        : t
    ));
    
    try {
      const response = await fetch(`/api/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: statusStr,
        }),
      });

      if (response.ok) fetchTasks(); // Refetch to sync UI met server/Notion
      else fetchTasks(); // Rollback if failed
    } catch (error) {
      console.error("Failed to update status:", error);
      fetchTasks();
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const taskId = draggableId;
    const task = tasks.find((t) => t.id === taskId);
    const newColumnId = destination.droppableId as ColumnId;
    const options = task?.providerType === "notion" && task?.providerId
      ? notionStatusOptions[task.providerId]
      : null;
    const newStatus = options?.length
      ? mapColumnToNotionStatus(newColumnId, options)
      : COLUMN_TO_STATUS[newColumnId];

    handleUpdateStatus(taskId, newStatus);
  };

  async function handleToggleComplete(task: Task) {
    const isCompleted = !!task.completedAt || DONE_STATUSES.includes((task.status || "").toLowerCase());
    const options = task.providerType === "notion" ? notionStatusOptions[task.providerId] : null;
    const newStatus = options?.length
      ? (isCompleted ? mapColumnToNotionStatus("todo", options) : mapColumnToNotionStatus("done", options))
      : (isCompleted ? "Not started" : "Done");

    try {
      const response = await fetch(`/api/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          completed: !isCompleted,
          status: newStatus
        }),
      });

      if (response.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to toggle completion:", error);
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title: newTaskTitle.trim() }),
      });

      if (response.ok) {
        setIsCreating(false);
        setNewTaskTitle("");
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) return;
    try {
      await fetch(`/api/tasks?id=${taskId}&action=delete`, { method: "DELETE" });
      fetchTasks();
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border bg-card shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <CheckSquare className="h-5 w-5 text-accent" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">{t("board")}</h1>
          </div>
          
          <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
            <button onClick={() => setViewMode("board")} className={`p-1.5 rounded-md transition-all ${viewMode === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={t("searchPlaceholder")} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors">
            <Plus className="h-4 w-4" />
            <span>{t("new")}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-muted/20">
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-muted-foreground">{t("boardLoading")}</p>
          </div>
        ) : viewMode === "board" ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 items-start h-full min-w-max pb-4">
              {columns.map(column => (
                <div key={column.id} className="flex flex-col gap-4 w-80 shrink-0">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <column.icon className={`h-4 w-4 ${column.color}`} />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{column.label}</h3>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {filteredTasks.filter(t => getTaskStatus(t) === column.id).length}
                      </span>
                    </div>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`space-y-3 min-h-[500px] rounded-xl transition-colors p-1 ${snapshot.isDraggingOver ? "bg-accent/5 ring-2 ring-accent/20" : ""}`}
                      >
                        {filteredTasks
                          .filter(t => getTaskStatus(t) === column.id)
                          .map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? "z-50" : ""}
                                >
                                  <TaskCard 
                                    task={task} 
                                    notionStatusOptions={notionStatusOptions}
                                    onToggle={() => handleToggleComplete(task)}
                                    onDelete={() => handleDeleteTask(task.id)}
                                    onUpdateStatus={(s) => handleUpdateStatus(task.id, s)}
                                    onClick={() => setSelectedTask(task)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
                        }
                        {provided.placeholder}
                        {filteredTasks.filter(t => getTaskStatus(t) === column.id).length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-[10px] text-muted-foreground/50 uppercase tracking-tighter">
                            {t("dropHere")}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="max-w-4xl mx-auto space-y-2">
            {filteredTasks.map(task => (
              <TaskListItem 
                key={task.id} 
                task={task} 
                onToggle={() => handleToggleComplete(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchTasks}
          onDelete={() => handleDeleteTask(selectedTask.id)}
        />
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsCreating(false)}>
          <div className="bg-popover border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t("addTask")}</h2>
              <input 
                type="text"
                autoFocus
                placeholder={t("addTaskPlaceholder")}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTask();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t("addTaskDescription")}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 bg-muted/30 border-t border-border">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">
                {t("cancel")}
              </button>
              <button 
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || isSubmitting}
                className="bg-accent text-accent-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                {isSubmitting ? t("adding") : t("add")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskDetailModal({ task, onClose, onUpdate, onDelete }: { task: Task; onClose: () => void; onUpdate: () => void; onDelete: () => void }) {
  const t = useTranslations("Tasks");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const isManual = task.providerType === "manual";

  async function handleSave() {
    if (!isManual) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, title, description }),
      });
      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-popover border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
              task.providerType === "notion" ? "bg-zinc-100 text-zinc-900 border-zinc-200" :
              task.providerType === "github" ? "bg-slate-100 text-slate-900 border-slate-200" :
              "bg-blue-50 text-blue-700 border-blue-100"
            }`}>
              {task.providerType}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Titel</label>
              {isManual ? (
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              ) : (
                <div className="text-sm font-medium text-foreground">{task.title}</div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Beschrijving</label>
              {isManual ? (
                <textarea 
                  rows={4}
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Voeg details toe..."
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
              ) : (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto pr-2">{task.description || "Geen beschrijving"}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">{t("status")}</label>
                <div className="text-xs text-foreground flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${task.completedAt ? "bg-emerald-500" : "bg-blue-500"}`} />
                  {task.status || (task.completedAt ? t("completed") : t("toDo"))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Deadline</label>
                <div className="text-xs text-foreground">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : t("noDate")}
                </div>
              </div>
            </div>

            {task.scheduledAt && (
              <div className="pt-4 border-t border-border">
                <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Ingepland op</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-accent">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(task.scheduledAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}</span>
                  </div>
                  <Link 
                    href={`/dashboard?date=${new Date(task.scheduledAt).toISOString()}`}
                    className="text-[10px] text-accent hover:underline flex items-center gap-1"
                  >
                    {t("viewInCalendar")} <ChevronRight className="h-2 w-2" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-muted/30 border-t border-border">
          {task.externalUrl && (
            <a href={task.externalUrl} target="_blank" rel="noopener noreferrer" 
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg mr-auto">
              <ExternalLink className="h-3.5 w-3.5" />
              {t("viewIn")} {task.providerType === "notion" ? t("notion") : task.providerType === "github" ? t("github") : t("local")}
            </a>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">
            Sluiten
          </button>
          {isManual && (
            <button 
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="bg-accent text-accent-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
            >
              {isSaving ? "Opslaan..." : "Opslaan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const DONE_STATUSES = ["done", "completed", "closed", "gereed", "voltooid", "klaar", "finished"];

function TaskCard({ task, notionStatusOptions, onToggle, onDelete, onUpdateStatus, onClick }: { 
  task: Task; 
  notionStatusOptions?: Record<string, string[]>;
  onToggle: () => void; 
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
  onClick: () => void;
}) {
  const t = useTranslations("Tasks");
  const isCompleted = !!task.completedAt || DONE_STATUSES.includes((task.status || "").toLowerCase());
  
  const fetched = (task.providerType === "notion" && task.providerId ? notionStatusOptions?.[task.providerId] : null) ?? [];
  const opts = fetched.length > 0 ? fetched : (task.status ? [task.status] : []);
  const hasCurrent = task.status && opts.includes(task.status);
  const statusOptions = (hasCurrent ? opts : (task.status ? [task.status, ...opts] : opts)).map((v) => ({ value: v, label: v }));

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${isCompleted ? "opacity-60 bg-muted/30" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted ? "bg-accent border-accent text-accent-foreground" : "border-muted-foreground/30 hover:border-accent"
          }`}
        >
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium leading-tight mb-1 ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </div>
          
          {task.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border ${
              task.providerType === "notion" ? "bg-zinc-100 text-zinc-900 border-zinc-200" :
              task.providerType === "github" ? "bg-slate-100 text-slate-900 border-slate-200" :
              "bg-blue-50 text-blue-700 border-blue-100"
            }`}>
              {task.providerType === "notion" ? t("notion") : task.providerType === "github" ? t("github") : t("local")}
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                <Calendar className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: nl })}</span>
              </div>
            )}
            
            {task.scheduledAt && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                <Clock className="h-3 w-3" />
                <span>{t("planned")}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        {task.externalUrl && (
          <a href={task.externalUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded" onClick={e => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      
      {task.providerType === "notion" && (
        <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">{t("status")}</span>
          <select 
            value={task.status || "Todo"}
            onChange={(e) => onUpdateStatus(e.target.value)}
            className="text-[10px] bg-muted/80 border-none rounded px-1.5 py-0.5 focus:ring-0 cursor-pointer font-medium"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function TaskListItem({ task, onToggle, onDelete, onClick }: { task: Task; onToggle: () => void; onDelete: () => void; onClick: () => void }) {
  const t = useTranslations("Tasks");
  const isCompleted = !!task.completedAt;
  
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:shadow-sm transition-all cursor-pointer ${isCompleted ? "opacity-60 bg-muted/30" : ""}`}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted ? "bg-accent border-accent text-accent-foreground" : "border-muted-foreground/30 hover:border-accent"
        }`}
      >
        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
           <div className={`text-[9px] font-bold uppercase tracking-tighter ${
              task.providerType === "notion" ? "text-zinc-500" :
              task.providerType === "github" ? "text-slate-500" :
              "text-blue-500"
            }`}>
              {task.providerType}
            </div>
            {task.scheduledAt && (
              <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">● {t("planned")}</span>
            )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {task.dueDate && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: nl })}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          {task.externalUrl && (
            <a href={task.externalUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-foreground rounded-lg" onClick={e => e.stopPropagation()}>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-muted-foreground hover:text-destructive rounded-lg">
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
        </div>
      </div>
    </div>
  );
}
