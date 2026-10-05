import type { SortOption, Task } from "@/lib/types";
import type { Lang } from "@/lib/i18n/dictionaries";

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

function statusRank(t: { status: "pending" | "completed" }): number {
  return t.status === "completed" ? 1 : 0;
}

export function sortTasks(tasks: Task[], sort: SortOption, lang: Lang = "es"): Task[] {
  const arr = [...tasks];
  switch (sort) {
    case "due_date":
      return arr.sort((a, b) => {
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && b.due_date) {
          if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
          const tc = (a.due_time ?? "").localeCompare(b.due_time ?? "");
          if (tc !== 0) return tc;
          return a.position - b.position;
        }
        return b.created_at.localeCompare(a.created_at);
      });
    case "priority":
      return arr.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.position !== b.position) return a.position - b.position;
        return b.created_at.localeCompare(a.created_at);
      });
    case "title":
      return arr.sort((a, b) => {
        const tc = a.title.localeCompare(b.title, lang);
        if (tc !== 0) return tc;
        return a.position - b.position;
      });
    case "manual":
      return arr.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return b.created_at.localeCompare(a.created_at);
      });
    case "created_at":
      return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** Filtra por lista: "all" todo, "none" sin lista, o id concreto. */
export function filterByList<T extends { list_id: string | null }>(
  tasks: T[],
  listId: string | "all" | "none"
): T[] {
  if (listId === "all") return tasks;
  if (listId === "none") return tasks.filter((t) => !t.list_id);
  return tasks.filter((t) => t.list_id === listId);
}

/** Pipeline completo: completadas → búsqueda → orden. Pendientes siempre antes que completadas. */
export function applyTaskFilters(
  tasks: Task[],
  opts: { query: string; showCompleted: boolean; sort: SortOption; lang?: Lang }
): Task[] {
  const sorted = sortTasks(filterTasksByQuery(tasks, opts.query), opts.sort, opts.lang ?? "es");
  const pending = sorted.filter((t) => t.status !== "completed");
  const done = sorted.filter((t) => t.status === "completed");
  return opts.showCompleted ? [...pending, ...done] : pending;
}

type OrderKey = Pick<Task, "due_date" | "due_time" | "priority" | "title" | "status" | "created_at">;

/**
 * ¿El orden dado respeta el `sort` activo? Se usa antes de persistir un
 * reordenamiento manual: si lo rompe, la UI avisa en vez de guardar.
 */
export function orderRespectsSort(tasks: OrderKey[], sort: SortOption, lang: Lang = "es"): boolean {
  if (sort === "manual") return true;
  for (let i = 1; i < tasks.length; i++) {
    const a = tasks[i - 1];
    const b = tasks[i];
    // Las pendientes siempre van antes que las completadas.
    if (statusRank(a) !== statusRank(b)) return false;
    let cmp = 0;
    switch (sort) {
      case "due_date": {
        const da = a.due_date ?? "";
        const db = b.due_date ?? "";
        // Sin fecha van al final.
        if (!da && db) cmp = 1;
        else if (da && !db) cmp = -1;
        else if (da !== db) cmp = da < db ? -1 : 1;
        else cmp = (a.due_time ?? "").localeCompare(b.due_time ?? "");
        break;
      }
      case "priority":
        cmp = a.priority - b.priority;
        break;
      case "title":
        cmp = a.title.localeCompare(b.title, lang);
        break;
      case "created_at":
        // Recientes primero: cualquier cambio lo rompe (salvo no mover nada).
        cmp = b.created_at.localeCompare(a.created_at);
        break;
    }
    if (cmp > 0) return false;
  }
  return true;
}
