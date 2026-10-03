import type { SortOption, Task } from "@/lib/types";

/** Filtra por texto en título y descripción (tiempo real, insensible a mayúsculas). */
export function filterTasksByQuery(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q)
  );
}

/** Oculta las completadas si el switch está apagado. */
export function filterCompleted(tasks: Task[], showCompleted: boolean): Task[] {
  if (showCompleted) return tasks;
  return tasks.filter((t) => t.status !== "completed");
}

export function sortTasks(tasks: Task[], sort: SortOption): Task[] {
  const arr = [...tasks];
  switch (sort) {
    case "due_date":
      return arr.sort((a, b) => {
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && b.due_date) {
          if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
          return (a.due_time ?? "").localeCompare(b.due_time ?? "");
        }
        return b.created_at.localeCompare(a.created_at);
      });
    case "priority":
      return arr.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.created_at.localeCompare(a.created_at);
      });
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title, "es"));
    case "created_at":
      return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** Pipeline completo: completadas → búsqueda → orden. Pendientes siempre antes que completadas. */
export function applyTaskFilters(
  tasks: Task[],
  opts: { query: string; showCompleted: boolean; sort: SortOption }
): Task[] {
  const sorted = sortTasks(filterTasksByQuery(tasks, opts.query), opts.sort);
  const pending = sorted.filter((t) => t.status !== "completed");
  const done = sorted.filter((t) => t.status === "completed");
  return opts.showCompleted ? [...pending, ...done] : pending;
}
