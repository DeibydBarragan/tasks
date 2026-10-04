"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { TaskToolbar } from "@/components/task-toolbar";
import { ListPills } from "@/components/list-pills";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { TaskChainTrack } from "@/components/task-chain-track";
import { TaskKanban } from "@/components/task-kanban";
import { ViewSwitch } from "@/components/view-switch";
import { useViewMode } from "@/components/use-view-mode";
import { useLang } from "@/components/language";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters, filterByList } from "@/lib/task-filters";
import { buildTaskChains, findChainForTask } from "@/lib/chains";
import { longDateLabel } from "@/lib/dates";

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
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("priority");
  const [viewMode, setViewMode] = useViewMode("tasks-hoy-view");
  const [listId, setListId] = useState<string | "all">("all");

  const overdueAll = useMemo(
    () =>
      applyTaskFilters(
        tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "completed"),
        { query, showCompleted: true, sort, lang }
      ),
    [tasks, today, query, sort, lang]
  );

  const todayAll = useMemo(
    () =>
      applyTaskFilters(
        tasks.filter((t) => t.due_date === today),
        { query, showCompleted, sort, lang }
      ),
    [tasks, today, query, showCompleted, sort, lang]
  );

  const pillScope = useMemo(() => [...overdueAll, ...todayAll], [overdueAll, todayAll]);

  const overdue = useMemo(
    () => (listId === "all" ? overdueAll : filterByList(overdueAll, listId)),
    [overdueAll, listId]
  );

  const todayTasks = useMemo(
    () => (listId === "all" ? todayAll : filterByList(todayAll, listId)),
    [todayAll, listId]
  );


  const pendingToday = todayTasks.filter((t) => t.status !== "completed").length;
  const dateLabel = longDateLabel(today, lang);

  // Vista Flujos: cadenas sobre lo visible (atrasadas + hoy) + individuales
  const flowVisible = useMemo(() => [...overdue, ...todayTasks], [overdue, todayTasks]);
  const flowChains = useMemo(() => buildTaskChains(flowVisible), [flowVisible]);
  const flowStandalone = useMemo(
    () => flowVisible.filter((t) => !findChainForTask(flowChains, t.id)),
    [flowVisible, flowChains]
  );

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.today.title}</h1>
            <p className="mt-1 text-sm text-muted capitalize">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch mode={viewMode} onChange={setViewMode} />
            <TaskFormModal lists={lists} tasks={tasks} defaultDueDate={today} />
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

      {viewMode === "chain" ? (
        <TaskChainTrack
          chains={flowChains}
          standalone={flowStandalone}
          lists={lists}
          tasks={tasks}
        />
      ) : viewMode === "kanban" ? (
        <TaskKanban lists={lists} tasks={pillScope} />
      ) : (
        <>
          {overdue.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-danger">
            <AlertTriangle size={15} />
            {t.today.overdue} ({overdue.length})
          </h2>
          <TaskListGroup tasks={overdue} lists={lists} allTasks={tasks} />
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold text-foreground">
          {t.today.ofToday} ({pendingToday} {pendingToday === 1 ? t.today.pending : t.today.pendingPl})
        </h2>
        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-4xl" aria-hidden>{query ? "∅" : "○"}</p>
            <p className="mt-2 font-medium">
              {query ? t.today.noResults : t.today.empty}
            </p>
            <p className="mt-1 text-sm text-muted">
              {query ? t.today.searchHint : t.today.emptyHint}
            </p>
          </div>
        ) : (
          <TaskListGroup tasks={todayTasks} lists={lists} allTasks={tasks} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
