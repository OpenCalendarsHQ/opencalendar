"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Task {
  id: string;
  title: string;
  [key: string]: any;
}

interface DragContextType {
  draggingTask: Task | null;
  setDraggingTask: (task: Task | null) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export function DragProvider({ children }: { children: ReactNode }) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  return (
    <DragContext.Provider value={{ draggingTask, setDraggingTask }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDrag must be used within DragProvider");
  }
  return context;
}
