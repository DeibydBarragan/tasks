"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import { ListIcon } from "@/components/list-icon";
import { ListPills } from "@/components/list-pills";
import { ListFormModal } from "@/components/list-form-modal";
import { DeleteModal } from "@/components/delete-modal";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { TaskToolbar } from "@/components/task-toolbar";
import { TaskChainTrack } from "@/components/task-chain-track";
import { TaskKanban } from "@/components/task-kanban";
import { ViewSwitch } from "@/components/view-switch";
import { useViewMode } from "@/components/use-view-mode";
import { useLang } from "@/components/language";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters, filterByList } from "@/lib/task-filters";
import { buildTaskChains } from "@/lib/chains";
import { deleteList } from "@/actions/lists";
import { clearCompleted } from "@/actions/tasks";

export function TasksClient({ lists, tasks }: { lists: TaskList[]; tasks: Task[] }) {
  const { lang, t } = useLang();
  const [activeListId, setActiveListId] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("due_date");
  const [clearOpen, setClearOpen] = useState(false);
  const [viewMode, setViewMode] = useViewMode("tasks-tareas-view");

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const visible = useMemo(() => {
    const inList = filterByList(tasks, activeListId);
    return applyTaskFilters(inList, { query, showCompleted, sort, lang });
  }, [tasks, activeListId, query, showCompleted, sort, lang]);

  const activeList = activeListId === "all" ? null : (listById.get(activeListId) ?? null);
  const pendingCount = visible.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const chainCandidates = useMemo(
    () => applyTaskFilters(tasks, { query, showCompleted: true, sort, lang }),
    [tasks, query, sort, lang]
  );
  const flowChains = useMemo(() => buildTaskChains(chainCandidates), [chainCandidates]);
  const chainedIds = useMemo(
    () => new Set(flowChains.flatMap((ch) => ch.tasks.map((t) => t.id))),
    [flowChains]
  );
  const flowStandalone = useMemo(
    () =>
      chainCandidates
        .filter((t) => !chainedIds.has(t.id))
        .filter((t) => showCompleted || t.status !== "completed")
        .filter((t) =>
          activeListId === "all" || t.list_id === activeListId || (activeListId === "none" && !t.list_id)
        ),
    [chainCandidates, chainedIds, showCompleted, activeListId]
  );
  const isInChainScope = useMemo(
    () => (t: Task) =>
      activeListId === "all" || t.list_id === activeListId || (activeListId === "none" && !t.list_id),
    [activeListId]
  );
  const kanbanTasks = useMemo(
    () => applyTaskFilters(tasks, { query, showCompleted, sort, lang }),
    [tasks, query, showCompleted, sort, lang]
  );

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {t.all.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {pendingCount === 0 && !query
                ? t.all.empty
                : `${pendingCount} ${pendingCount === 1 ? t.all.pending : t.all.pendingPl}${
                    completedCount > 0 ? ` · ${completedCount} ${completedCount === 1 ? t.all.doneSing : t.all.donePl}` : ""
                  }`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch mode={viewMode} onChange={setViewMode} />
            <ListFormModal />
            <TaskFormModal lists={lists} tasks={tasks} defaultListId={activeList?.id} />
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
        <FadeIn delay={0.05}>
          <ListPills lists={lists} tasks={tasks} value={activeListId} onChange={setActiveListId} />
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
        <TaskKanban lists={lists} tasks={kanbanTasks} />
      ) : (
        <>
          {activeList && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeList.color }} />
                <ListIcon icon={activeList.icon} size={16} />
                {activeList.name}
              </span>
              <span className="flex items-center gap-1">
                <ListFormModal list={activeList} triggerLabel={t.lists.edit} />
                <DeleteModal
                  title={t.lists.deleteTitle}
                  message={`«${activeList.name}» ${t.lists.deleteMsg}`}
                  ariaLabel={`${t.lists.deleteTitle}: ${activeList.name}`}
                  onConfirm={async () => {
                    await deleteList(activeList.id);
                    setActiveListId("all");
                  }}
                />
              </span>
            </div>
          )}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-4xl" aria-hidden>{query ? "∅" : "○"}</p>
              <p className="mt-2 font-medium">
                {query ? t.all.noResults : t.all.noTasks}
              </p>
              <p className="mt-1 text-sm text-muted">
                {query ? t.all.searchHint : t.all.newHint}
              </p>
            </div>
          ) : (
            <Stagger className="flex flex-col gap-2.5">
              {visible.map((t) => (
                <StaggerItem key={t.id}>
                  <TaskCard
                    task={t}
                    list={t.list_id ? (listById.get(t.list_id) ?? null) : null}
                    lists={lists}
                    tasks={tasks}
                    nextTitle={t.next_task_id ? byId.get(t.next_task_id)?.title : null}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </>
      )}

      {/* Historial de completadas: limpiar */}
      {completedCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-2.5">
          <p className="text-xs text-muted">
            {completedCount} {completedCount === 1 ? t.all.doneSing : t.all.donePl} ({t.all.history}).
            {" "}{t.all.historyHint}
          </p>
          {clearOpen ? (
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium">{t.all.clearAsk}</span>
              <Button
                size="sm"
                variant="danger"
                className="rounded-xl font-semibold"
                onPress={async () => {
                  await clearCompleted();
                  setClearOpen(false);
                }}
              >
                {t.all.confirm}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onPress={() => setClearOpen(false)}
              >
                {t.all.no}
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-muted hover:text-danger"
              onPress={() => setClearOpen(true)}
            >
              <Trash2 size={14} className="mr-1" />
              {t.all.clear}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
