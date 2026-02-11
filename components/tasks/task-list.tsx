"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Calendar, Clock, Tag, Plus, Trash2, Check, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useDrag } from "@/lib/drag-context";

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
}

interface TaskListProps {
  onTaskDragStart?: (task: Task) => void;
}

interface GroupedTasks {
  personal: Task[];
  notion: Task[];
  github: Task[];
}

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.336.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
    </svg>
  );
}

const providerIcons = {
  notion: NotionIcon,
  github: GitHubIcon,
  manual: CheckSquare,
};

const DONE_STATUSES = ["done", "completed", "closed", "gereed", "voltooid", "klaar", "finished"];

export function TaskList({ onTaskDragStart }: TaskListProps) {
  const t = useTranslations("Tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "unscheduled">("unscheduled");
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["personal", "notion", "github"]));
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [notionStatusOptions, setNotionStatusOptions] = useState<Record<string, string[]>>({});
  const { setDraggingTask } = useDrag();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (editingStatus) {
      const task = tasks.find((t) => t.id === editingStatus);
      if (task?.providerType === "notion") {
        fetchNotionStatusOptionsForProvider(task.providerId);
      }
    }
  }, [editingStatus, tasks]);

  async function fetchTasks() {
    try {
      const response = await fetch("/api/tasks?includeCompleted=true");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleGroup(group: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function groupTasks(tasks: Task[]): GroupedTasks {
    return tasks.reduce(
      (acc, task) => {
        if (task.providerType === "manual") {
          acc.personal.push(task);
        } else if (task.providerType === "notion") {
          acc.notion.push(task);
        } else if (task.providerType === "github") {
          acc.github.push(task);
        }
        return acc;
      },
      { personal: [], notion: [], github: [] } as GroupedTasks
    );
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: newTaskTitle.trim(),
        }),
      });

      if (response.ok) {
        setIsCreating(false);
        setNewTaskTitle("");
        fetchTasks(); // Refresh
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const response = await fetch(`/api/tasks?id=${taskId}&action=delete`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTasks(); // Refresh
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  async function handleToggleComplete(task: Task) {
    const isCompleted = !!task.completedAt || DONE_STATUSES.includes((task.status || "").toLowerCase());
    try {
      const response = await fetch(`/api/tasks?id=${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          completed: !isCompleted,
        }),
      });

      if (response.ok) {
        fetchTasks(); // Refresh
      }
    } catch (error) {
      console.error("Failed to toggle task completion:", error);
    }
  }

  async function fetchNotionStatusOptionsForProvider(providerId: string): Promise<string[]> {
    if (notionStatusOptions[providerId]) return notionStatusOptions[providerId];
    try {
      const res = await fetch(`/api/tasks/notion/status-options?providerId=${providerId}`);
      if (res.ok) {
        const { options } = await res.json();
        setNotionStatusOptions((prev) => ({ ...prev, [providerId]: options }));
        return options;
      }
    } catch (e) {
      console.error("Failed to fetch Notion status options:", e);
    }
    return [];
  }

  async function fetchNotionStatusOptionsForProvider(providerId: string): Promise<string[]> {
    if (notionStatusOptions[providerId]) return notionStatusOptions[providerId];
    try {
      const res = await fetch(`/api/tasks/notion/status-options?providerId=${providerId}`);
      if (res.ok) {
        const { options } = await res.json();
        setNotionStatusOptions((prev) => ({ ...prev, [providerId]: options }));
        return options;
      }
    } catch (e) {
      console.error("Failed to fetch Notion status options:", e);
    }
    return [];
  }

  async function handleUpdateStatus(taskId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        setEditingStatus(null);
        fetchTasks(); // Refresh
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    // By default, hide completed tasks in the sidebar unless they were just completed in this session
    if (!!task.completedAt && filter !== "all") return false;
    
    if (filter === "scheduled") return task.scheduledEventId !== null;
    if (filter === "unscheduled") return task.scheduledEventId === null;
    return true;
  });

  const groupedTasks = groupTasks(filteredTasks);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-xs text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  const renderTaskGroup = (title: string, tasks: Task[], groupKey: string, icon: React.ReactNode) => {
    if (tasks.length === 0) return null;

    const isExpanded = expandedGroups.has(groupKey);

    return (
      <div className="mb-3">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(groupKey)}
          className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 rounded"
        >
          <div className="flex items-center gap-1.5">
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {icon}
            <span>{title}</span>
            <span className="text-[10px] text-muted-foreground">({tasks.length})</span>
          </div>
        </button>

        {/* Group Tasks */}
        {isExpanded && (
          <div className="space-y-1.5 mt-1.5">
            {tasks.map((task) => {
              const ProviderIcon = providerIcons[task.providerType];
              const isCompleted = !!task.completedAt || DONE_STATUSES.includes((task.status || "").toLowerCase());

              return (
                <div
                  key={task.id}
                  draggable={!task.scheduledEventId && !isCompleted}
                  onDragStart={(e) => {
                    if (!task.scheduledEventId && !isCompleted) {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingTask(task);
                      if (onTaskDragStart) {
                        onTaskDragStart(task);
                      }
                    }
                  }}
                  onDragEnd={() => {
                    setDraggingTask(null);
                  }}
                  className={`group relative rounded-lg border bg-card p-2.5 text-xs transition-all ${
                    isCompleted
                      ? "border-border/50 opacity-50"
                      : task.scheduledEventId
                      ? "border-accent/30 opacity-70"
                      : "border-border cursor-move hover:border-accent hover:shadow-sm"
                  }`}
                >
                  {/* Header with checkbox and actions */}
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={`shrink-0 rounded border-2 transition-colors ${
                          isCompleted
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-muted-foreground/30 hover:border-accent"
                        }`}
                        style={{ width: "14px", height: "14px" }}
                        title={isCompleted ? t("markIncomplete") : t("markComplete")}
                      >
                        {isCompleted && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </button>

                      <ProviderIcon className="h-3 w-3 shrink-0 text-muted-foreground" />

                      {/* Status badge - clickable for Notion tasks */}
                      {task.status && (
                        task.providerType === "notion" && editingStatus === task.id ? (
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                            onBlur={() => setEditingStatus(null)}
                            className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground border-none outline-none"
                            autoFocus
                          >
                            {(() => {
                              const fetched = notionStatusOptions[task.providerId] ?? [];
                              const opts = fetched.length > 0
                                ? (fetched.includes(task.status!) ? fetched : [task.status!, ...fetched])
                                : (task.status ? [task.status] : []);
                              return opts.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
                          </select>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (task.providerType === "notion") {
                                setEditingStatus(task.id);
                              }
                            }}
                            className={`rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground ${
                              task.providerType === "notion" ? "hover:bg-muted/80 cursor-pointer" : ""
                            }`}
                            disabled={task.providerType !== "notion"}
                            title={task.providerType === "notion" ? t("clickToChangeStatus") : ""}
                          >
                            {task.status}
                          </button>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {task.providerType === "manual" && !isCompleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                          title={t("delete")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      {task.externalUrl && (
                        <a
                          href={task.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className={`mb-1 font-medium leading-tight ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    {task.dueDate && (
                      <div className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>
                          {formatDistanceToNow(new Date(task.dueDate), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </span>
                      </div>
                    )}
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Tag className="h-2.5 w-2.5" />
                        <span>{task.labels[0]}</span>
                        {task.labels.length > 1 && (
                          <span className="text-muted-foreground/70">
                            +{task.labels.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                    {task.scheduledEventId && (
                      <div className="flex items-center gap-0.5 text-accent">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>{t("planned")}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {task.priority && (
                    <div
                      className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${
                        task.priority === "High" || task.priority === "Urgent"
                          ? "bg-red-500"
                          : task.priority === "Medium"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {/* Header with add button */}
        <div className="flex items-center justify-between px-2 pt-0 pb-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={t("addTaskTitle")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Create task form */}
        {isCreating && (
          <div className="mb-1 mx-2 rounded-lg border border-accent bg-card p-2">
            <input
              type="text"
              placeholder={`${t("addPersonalTask")}...`}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskTitle.trim() && !isSubmitting) {
                  handleCreateTask();
                } else if (e.key === "Escape") {
                  setIsCreating(false);
                  setNewTaskTitle("");
                }
              }}
              className="w-full px-2 py-1 text-xs bg-background border border-border rounded"
              autoFocus
            />
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || isSubmitting}
                className="flex-1 rounded bg-accent px-2 py-1 text-xs font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t("adding") : t("add")}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTaskTitle("");
                }}
                disabled={isSubmitting}
                className="flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
          <div className="text-xs text-muted-foreground">
            {t("noTasks")}
          </div>
          <div className="text-[10px] text-muted-foreground/70">
            {t("noTasksHint")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-2 pt-0 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Taken
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title={t("addPersonalTask")}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Create task form */}
      {isCreating && (
        <div className="mb-1 mx-2 rounded-lg border border-accent bg-card p-2">
          <input
            type="text"
            placeholder={`${t("addPersonalTask")}...`}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTaskTitle.trim() && !isSubmitting) {
                handleCreateTask();
              } else if (e.key === "Escape") {
                setIsCreating(false);
                setNewTaskTitle("");
              }
            }}
            className="w-full px-2 py-1 text-xs bg-background border border-border rounded"
            autoFocus
          />
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isSubmitting}
              className="flex-1 rounded bg-accent px-2 py-1 text-xs font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Bezig..." : "Toevoegen"}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewTaskTitle("");
              }}
              disabled={isSubmitting}
              className="flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-1 text-[10px] mb-1">
        <button
          onClick={() => setFilter("unscheduled")}
          className={`flex-1 rounded px-2 py-1 ${
            filter === "unscheduled"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("unscheduled")} ({tasks.filter((task) => !task.scheduledEventId && !task.completedAt).length})
        </button>
        <button
          onClick={() => setFilter("scheduled")}
          className={`flex-1 rounded px-2 py-1 ${
            filter === "scheduled"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("scheduled")} ({tasks.filter((task) => task.scheduledEventId).length})
        </button>
      </div>

      {/* Grouped Task Lists */}
      <div className="space-y-1">
        {renderTaskGroup(
          t("personalTasks"),
          groupedTasks.personal,
          "personal",
          <CheckSquare className="h-3 w-3" />
        )}
        {renderTaskGroup(
          "Notion",
          groupedTasks.notion,
          "notion",
          <NotionIcon className="h-3 w-3" />
        )}
        {renderTaskGroup(
          "GitHub",
          groupedTasks.github,
          "github",
          <GitHubIcon className="h-3 w-3" />
        )}
      </div>

      {filteredTasks.length === 0 && (
        <div className="py-4 text-center text-[10px] text-muted-foreground">
          {filter === "scheduled" ? t("noScheduledTasks") : t("noUnscheduledTasks")}
        </div>
      )}
    </div>
  );
}

function CheckSquare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
