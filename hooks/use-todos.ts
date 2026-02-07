"use client";

import { useState, useCallback } from "react";
import type { Todo, TodoList } from "@/lib/types";

const DEFAULT_LISTS: TodoList[] = [
  { id: "inbox", name: "Inbox", color: "#737373", icon: "inbox" },
  { id: "personal", name: "Persoonlijk", color: "#737373", icon: "user" },
  { id: "work", name: "Werk", color: "#737373", icon: "briefcase" },
];

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists] = useState<TodoList[]>(DEFAULT_LISTS);

  const addTodo = useCallback(
    (title: string, listId: string = "inbox", dueDate?: Date) => {
      const newTodo: Todo = {
        id: `todo-${Date.now()}`,
        title,
        completed: false,
        dueDate,
        priority: "medium",
        color: "#737373",
        listId,
        createdAt: new Date(),
        order: todos.length,
      };
      setTodos((prev) => [newTodo, ...prev]);
      return newTodo;
    },
    [todos.length]
  );

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const todosForDate = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return todos.filter((t) => {
        if (!t.dueDate) return false;
        return t.dueDate.toISOString().split("T")[0] === dateStr;
      });
    },
    [todos]
  );

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return {
    todos,
    lists,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    todosForDate,
    incompleteTodos,
    completedTodos,
  };
}
