"use client";

import { TaskBoard } from "@/components/tasks/task-board";

export default function TasksPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <main className="flex-1 overflow-hidden">
        <TaskBoard />
      </main>
    </div>
  );
}
