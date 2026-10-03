"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { TaskToolbar } from "@/components/task-toolbar";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters } from "@/lib/task-filters";

function useTaskMaps(lists: TaskList[], tasks: Task[]) {
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  return { byId, listById };
}

export function TaskListGroup({
  tasks,
  lists,
  allTasks,
}: {
  tasks: Task[];
  lists: TaskList[];
  allTasks?: Task[];
}) {
  const { byId, listById } = useTaskMaps(lists, tasks);
  const context = allTasks ?? tasks;
  if (tasks.length === 0) return null;
  return (
    <Stagger className="flex flex-col gap-2.5">
      {tasks.map((t) => (
        <StaggerItem key={t.id}>
          <TaskCard
            task={t}
            list={t.list_id ? (listById.get(t.list_id) ?? null) : null}
            lists={lists}
            tasks={context}
            nextTitle={t.next_task_id ? byId.get(t.next_task_id)?.title : null}
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export function TodayClient({
  lists,
  tasks,
  today,
}: {
  lists: TaskList[];
  tasks: Task[];
  today: string;
}) {
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("priority");

  const overdue = useMemo(
    () =>
      applyTaskFilters(
        tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "completed"),
        { query, showCompleted: true, sort }
      ),
    [tasks, today, query, sort]
  );

  const todayTasks = useMemo(
    () =>
      applyTaskFilters(
        tasks.filter((t) => t.due_date === today),
        { query, showCompleted, sort }
      ),
    [tasks, today, query, showCompleted, sort]
  );

  const pendingToday = todayTasks.filter((t) => t.status !== "completed").length;
  const dateLabel = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(today + "T12:00:00"));

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">Hoy</h1>
            <p className="mt-1 text-sm text-muted capitalize">{dateLabel}</p>
          </div>
          <TaskFormModal lists={lists} tasks={tasks} defaultDueDate={today} />
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <TaskToolbar
          query={query}
          onQuery={setQuery}
          showCompleted={showCompleted}
          onShowCompleted={setShowCompleted}
          sort={sort}
          onSort={setSort}
        />
      </FadeIn>

      {overdue.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-danger">
            <AlertTriangle size={15} />
            Atrasadas ({overdue.length})
          </h2>
          <TaskListGroup tasks={overdue} lists={lists} allTasks={tasks} />
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold text-foreground">
          De hoy ({pendingToday} pendiente{pendingToday === 1 ? "" : "s"})
        </h2>
        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-4xl" aria-hidden>{query ? "∅" : "○"}</p>
            <p className="mt-2 font-medium">
              {query ? "Sin resultados para tu búsqueda" : "Nada programado para hoy"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {query
                ? "Prueba con otras palabras."
                : "Crea una tarea con fecha de hoy o ponte al día con las atrasadas."}
            </p>
          </div>
        ) : (
          <TaskListGroup tasks={todayTasks} lists={lists} allTasks={tasks} />
        )}
      </section>
    </div>
  );
}
