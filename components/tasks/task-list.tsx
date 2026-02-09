"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Calendar, Clock, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useDrag } from "@/lib/drag-context";

interface Task {
  id: string;
  providerId: string;
  providerName: string;
  providerType: "notion" | "github";
  externalId: string;
  externalUrl: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  labels?: string[];
  scheduledEventId?: string;
  scheduledAt?: string;
}

interface TaskListProps {
  onTaskDragStart?: (task: Task) => void;
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
};

export function TaskList({ onTaskDragStart }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "unscheduled">("unscheduled");
  const { setDraggingTask } = useDrag();

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const response = await fetch("/api/tasks");
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

  const filteredTasks = tasks.filter((task) => {
    if (filter === "scheduled") return task.scheduledEventId !== null;
    if (filter === "unscheduled") return task.scheduledEventId === null;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-xs text-muted-foreground">Taken laden...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
        <div className="text-xs text-muted-foreground">
          Geen taken gevonden
        </div>
        <div className="text-[10px] text-muted-foreground/70">
          Verbind Notion of GitHub in de instellingen
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Filter buttons */}
      <div className="flex gap-1 text-[10px]">
        <button
          onClick={() => setFilter("unscheduled")}
          className={`flex-1 rounded px-2 py-1 ${
            filter === "unscheduled"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ongepland ({tasks.filter((t) => !t.scheduledEventId).length})
        </button>
        <button
          onClick={() => setFilter("scheduled")}
          className={`flex-1 rounded px-2 py-1 ${
            filter === "scheduled"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Gepland ({tasks.filter((t) => t.scheduledEventId).length})
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {filteredTasks.map((task) => {
          const ProviderIcon = providerIcons[task.providerType];

          return (
            <div
              key={task.id}
              draggable={!task.scheduledEventId}
              onDragStart={(e) => {
                if (!task.scheduledEventId) {
                  e.dataTransfer.effectAllowed = "move";
                  // Store task in context for drop handler
                  setDraggingTask(task);
                  // Also call callback if provided
                  if (onTaskDragStart) {
                    onTaskDragStart(task);
                  }
                }
              }}
              onDragEnd={() => {
                // Clear dragging task when drag ends
                setDraggingTask(null);
              }}
              className={`group relative rounded-lg border border-border bg-card p-2 text-xs transition-all ${
                task.scheduledEventId
                  ? "opacity-60"
                  : "cursor-move hover:border-accent hover:shadow-sm"
              }`}
            >
              {/* Header with provider icon and status */}
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ProviderIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {task.status && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {task.status}
                    </span>
                  )}
                </div>
                <a
                  href={task.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Title */}
              <div className="mb-1 font-medium leading-tight text-foreground">
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
                    <span>Gepland</span>
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

      {filteredTasks.length === 0 && (
        <div className="py-4 text-center text-[10px] text-muted-foreground">
          Geen {filter === "scheduled" ? "geplande" : "ongeplande"} taken
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
