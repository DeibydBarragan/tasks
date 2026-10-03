"use client";

import { useMemo, useState } from "react";
import { TaskToolbar } from "@/components/task-toolbar";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskListGroup } from "@/components/today-client";
import { FadeIn } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters } from "@/lib/task-filters";
import { addDaysISO, shortDateLabel } from "@/lib/dates";

export function UpcomingClient({
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
  const [sort, setSort] = useState<SortOption>("due_date");

  const days = useMemo(() => {
    const out: { iso: string; label: string; tasks: Task[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const iso = addDaysISO(today, i);
      const dayTasks = applyTaskFilters(
        tasks.filter((t) => t.due_date === iso),
        { query, showCompleted, sort }
      );
      if (dayTasks.length > 0 || !query) {
        out.push({ iso, label: shortDateLabel(iso, today), tasks: dayTasks });
      }
    }
    return out;
  }, [tasks, today, query, showCompleted, sort]);

  const total = days.reduce((acc, d) => acc + d.tasks.filter((t) => t.status !== "completed").length, 0);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">Próximos 7 días</h1>
            <p className="mt-1 text-sm text-muted">
              {total === 0
                ? "Semana despejada. ¿Planeamos algo?"
                : `${total} tarea${total === 1 ? "" : "s"} por venir`}
            </p>
          </div>
          <TaskFormModal
            lists={lists}
            tasks={tasks}
            defaultDueDate={addDaysISO(today, 1)}
          />
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

      {days.every((d) => d.tasks.length === 0) ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl" aria-hidden>○</p>
          <p className="mt-2 font-medium">Sin tareas en los próximos 7 días</p>
          <p className="mt-1 text-sm text-muted">Programa algo con fecha de esta semana.</p>
        </div>
      ) : (
        days.map((d) =>
          d.tasks.length === 0 ? null : (
            <section key={d.iso} className="flex flex-col gap-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground capitalize">
                {d.label}
                <span className="text-[11px] font-normal text-muted tabular-nums">
                  ({d.tasks.filter((t) => t.status !== "completed").length})
                </span>
              </h2>
              <TaskListGroup tasks={d.tasks} lists={lists} allTasks={tasks} />
            </section>
          )
        )
      )}
    </div>
  );
}
