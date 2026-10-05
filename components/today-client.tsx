"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "@heroui/react";
import { TaskToolbar } from "@/components/task-toolbar";
import { ListPills } from "@/components/list-pills";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { TaskChainTrack } from "@/components/task-chain-track";
import { TaskKanban } from "@/components/task-kanban";
import { useToday } from "@/components/use-today";
import { ViewSwitch } from "@/components/view-switch";
import { useViewMode } from "@/components/use-view-mode";
import { useLang } from "@/components/language";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters } from "@/lib/task-filters";
import { reorderTasks } from "@/actions/tasks";
import { buildTaskChains } from "@/lib/chains";
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
  sortable,
}: {
  tasks: Task[];
  lists: TaskList[];
  allTasks?: Task[];
  sortable?: { sort: SortOption };
}) {
  const { t } = useLang();
  const { byId, listById } = useTaskMaps(lists, tasks);
  const context = allTasks ?? tasks;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overAfter, setOverAfter] = useState(false);
  const [, startTransition] = useTransition();

  function resetDrag() {
    setDragId(null);
    setOverId(null);
    setOverAfter(false);
  }

  function handleDrop(targetId: string, after: boolean) {
    if (!sortable || !dragId || dragId === targetId) {
      resetDrag();
      return;
    }
    const ids = tasks.map((t) => t.id).filter((id) => id !== dragId);
    const idx = ids.indexOf(targetId) + (after ? 1 : 0);
    ids.splice(idx, 0, dragId);
    const moved = ids.some((id, i) => tasks[i]?.id !== id);
    resetDrag();
    if (!moved) return;
    startTransition(async () => {
      const res = await reorderTasks(ids, sortable.sort);
      if (res?.error) toast.danger(t.errors.orderConflict);
    });
  }

  if (tasks.length === 0) return null;
  return (
    <Stagger className="flex flex-col gap-2.5">
      {tasks.map((t) => (
        <StaggerItem key={t.id}>
          {overId === t.id && !overAfter && (
            <div aria-hidden className="h-0.5 -my-1 rounded-full bg-accent" />
          )}
          <div
            draggable={!!sortable}
            onDragStart={(e) => {
              if (!sortable) return;
              e.dataTransfer.setData("text/task-id", t.id);
              e.dataTransfer.effectAllowed = "move";
              setDragId(t.id);
            }}
            onDragOver={(e) => {
              if (!sortable || !dragId || dragId === t.id) return;
              e.preventDefault();
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              setOverId(t.id);
              setOverAfter(e.clientY > rect.top + rect.height / 2);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              handleDrop(t.id, e.clientY > rect.top + rect.height / 2);
            }}
            onDragEnd={resetDrag}
            className={sortable ? "cursor-grab active:cursor-grabbing" : undefined}
          >
            <TaskCard
              task={t}
              list={t.list_id ? (listById.get(t.list_id) ?? null) : null}
              lists={lists}
              tasks={context}
              nextTitle={t.next_task_id ? byId.get(t.next_task_id)?.title : null}
            />
          </div>
          {overId === t.id && overAfter && (
            <div aria-hidden className="h-0.5 -my-1 rounded-full bg-accent" />
          )}
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export function TodayClient({
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
    () =>
      (showCompleted ? overdueAll : overdueAll.filter((t) => t.status !== "completed")).filter(
        (t) => listId === "all" || t.list_id === listId || (listId === "none" && !t.list_id)
      ),
    [overdueAll, listId, showCompleted]
  );

  const todayTasks = useMemo(
    () =>
      (showCompleted ? todayAll : todayAll.filter((t) => t.status !== "completed")).filter(
        (t) => listId === "all" || t.list_id === listId || (listId === "none" && !t.list_id)
      ),
    [todayAll, listId, showCompleted]
  );


  const pendingToday = todayTasks.filter((t) => t.status !== "completed").length;
  const dateLabel = longDateLabel(today, lang);

  // Vista Flujos: cadenas completas (el toggle no las recorta) + fantasmas fuera de lista
  const flowCandidates = useMemo(() => [...overdueAll, ...todayAll], [overdueAll, todayAll]);
  const flowChains = useMemo(() => buildTaskChains(flowCandidates), [flowCandidates]);
  const chainedIds = useMemo(
    () => new Set(flowChains.flatMap((ch) => ch.tasks.map((t) => t.id))),
    [flowChains]
  );
  const flowStandalone = useMemo(
    () =>
      flowCandidates
        .filter((t) => !chainedIds.has(t.id))
        .filter((t) => showCompleted || t.status !== "completed")
        .filter((t) => listId === "all" || t.list_id === listId || (listId === "none" && !t.list_id)),
    [flowCandidates, chainedIds, showCompleted, listId]
  );
  const isInChainScope = useMemo(
    () => (t: Task) => listId === "all" || t.list_id === listId || (listId === "none" && !t.list_id),
    [listId]
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
          isInScope={isInChainScope}
          showCompleted={showCompleted}
        />
      ) : viewMode === "kanban" ? (
        <TaskKanban lists={lists} tasks={pillScope} sort={sort} />
      ) : (
        <>
          {overdue.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-danger">
            <AlertTriangle size={15} />
            {t.today.overdue} ({overdue.length})
          </h2>
          <TaskListGroup tasks={overdue} lists={lists} allTasks={tasks} sortable={{ sort }} />
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
          <TaskListGroup tasks={todayTasks} lists={lists} allTasks={tasks} sortable={{ sort }} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
