"use client";

import { useMemo, useState } from "react";
import { TaskToolbar } from "@/components/task-toolbar";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskListGroup } from "@/components/today-client";
import { TaskKanban } from "@/components/task-kanban";
import { useToday } from "@/components/use-today";
import { ListPills } from "@/components/list-pills";
import { ViewSwitch } from "@/components/view-switch";
import { useViewMode } from "@/components/use-view-mode";
import { useLang } from "@/components/language";
import { FadeIn } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters, filterByList } from "@/lib/task-filters";
import { addDaysISO, shortDateLabel } from "@/lib/dates";

export function UpcomingClient({
  lists,
  tasks,
  today: serverToday,
}: {
  lists: TaskList[];
  tasks: Task[];
  today: string;
}) {
  const { lang, t } = useLang();
  const today = useToday(serverToday);
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("due_date");
  const [viewMode, setViewMode] = useViewMode("tasks-proximos-view");
  const [listId, setListId] = useState<string | "all">("all");

  const days = useMemo(() => {
    const out: { iso: string; label: string; tasks: Task[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const iso = addDaysISO(today, i);
      const dayTasks = applyTaskFilters(
        tasks.filter((t) => t.due_date === iso),
        { query, showCompleted, sort, lang }
      );
      if (dayTasks.length > 0 || !query) {
        out.push({ iso, label: shortDateLabel(iso, today, lang), tasks: dayTasks });
      }
    }
    return out;
  }, [tasks, today, query, showCompleted, sort, lang]);

  const total = days.reduce((acc, d) => acc + d.tasks.filter((t) => t.status !== "completed").length, 0);
  const pillScope = useMemo(() => {
    const out: Task[] = [];
    for (let i = 1; i <= 7; i++) {
      const iso = addDaysISO(today, i);
      out.push(...applyTaskFilters(tasks.filter((t) => t.due_date === iso), { query, showCompleted: true, sort, lang }));
    }
    return out;
  }, [tasks, today, query, sort, lang]);
  const shownDays = useMemo(
    () =>
      listId === "all"
        ? days
        : days
            .map((d) => ({ ...d, tasks: filterByList(d.tasks, listId) }))
            .filter((d) => d.tasks.length > 0 || !query),
    [days, listId, query]
  );

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.upcoming.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {total === 0
                ? t.upcoming.emptyWeek
                : `${total} ${total === 1 ? t.upcoming.taskSing : t.upcoming.taskPl} ${t.upcoming.coming}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch mode={viewMode} onChange={setViewMode} showChain={false} />
            <TaskFormModal
              lists={lists}
              tasks={tasks}
              defaultDueDate={addDaysISO(today, 1)}
            />
          </div>
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

      {viewMode !== "kanban" && (
        <FadeIn delay={0.04}>
          <ListPills lists={lists} tasks={pillScope} value={listId} onChange={setListId} />
        </FadeIn>
      )}

      {viewMode === "kanban" ? (
        <TaskKanban lists={lists} tasks={pillScope} />
      ) : shownDays.every((d) => d.tasks.length === 0) ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl" aria-hidden>○</p>
          <p className="mt-2 font-medium">{t.upcoming.empty}</p>
          <p className="mt-1 text-sm text-muted">{t.upcoming.emptyHint}</p>
        </div>
      ) : (
        shownDays.map((d) =>
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
