"use client";

import { memo, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Button, Spinner } from "@heroui/react";
import { ArrowRight, CalendarDays, Check, CheckCircle2, Link2, Pencil, Timer, Workflow } from "lucide-react";
import type { Task, TaskList } from "@/lib/types";
import { toggleTaskStatus, deleteTask } from "@/actions/tasks";
import { DeleteModal } from "@/components/delete-modal";
import { GlassModal } from "@/components/glass-modal";
import { buildTaskChains, findChainForTask } from "@/lib/chains";
import { useLang } from "@/components/language";
import { TaskFormModal, TaskListBadge, priorityColor } from "@/components/task-form-modal";
import { FocusStartModal } from "@/components/focus-start-modal";
import { isOverdueISO, shortDateLabel, toLocalISODate, formatHours } from "@/lib/dates";

const TaskDetailModal = dynamic(
  () => import("@/components/task-detail-modal").then((m) => m.TaskDetailModal),
  { ssr: false }
);
const ChainPipelineModal = dynamic(
  () => import("@/components/chain-pipeline-modal").then((m) => m.ChainPipelineModal),
  { ssr: false }
);

export const TaskCard = memo(function TaskCard({
  task,
  list,
  lists,
  tasks,
  nextTitle,
  extraActions,
  actionsLayout = "side",
}: {
  task: Task;
  list: TaskList | null | undefined;
  lists: TaskList[];
  tasks: Task[];
  nextTitle?: string | null;
  extraActions?: React.ReactNode;
  actionsLayout?: "side" | "bottom";
}) {
  const { lang, t } = useLang();
  const stacked = actionsLayout === "bottom";
  const [done, setDone] = useState(task.status === "completed");
  const [pending, startTransition] = useTransition();
  const [nextInfo, setNextInfo] = useState<{ id: string; title: string } | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const today = toLocalISODate();
  const color = priorityColor(task.priority);
  const overdue = !done && isOverdueISO(task.due_date, today);

  const chain = useMemo(
    () => findChainForTask(buildTaskChains(tasks), task.id),
    [tasks, task.id]
  );

  function handleToggle() {
    const prev = done;
    setDone(!prev);
    startTransition(async () => {
      const res = await toggleTaskStatus(task.id);
      if (res?.error) {
        setDone(prev);
      } else if (!prev && res?.next) {
        // Se completó una tarea con siguiente paso: sugerirlo
        setNextInfo(res.next);
      }
    });
  }

  function closeNext() {
    setNextInfo(null);
    setShowPipeline(false);
  }

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      aria-label={`${t.task.openDetail}: ${task.title}`}
      onClick={() => setDetailOpen(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") setDetailOpen(true);
      }}
      className={`rounded-2xl border border-border bg-surface p-3.5 transition-all cursor-pointer hover:border-border/60 ${
        stacked ? "flex flex-col gap-2" : "flex items-start gap-3"
      } ${done ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
      {/* Checkbox redondeado */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? t.task.markPending : t.task.markDone}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        disabled={pending}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all cursor-pointer ${
          done
            ? "border-accent bg-accent text-accent-foreground"
            : "border-muted hover:border-accent"
        }`}
      >
        {pending ? (
          <Spinner size="sm" color="current" className="h-3 w-3" />
        ) : (
          done && <Check size={14} strokeWidth={3} />
        )}
      </button>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className={`text-sm font-medium leading-snug text-foreground ${
            done ? "line-through text-muted" : ""
          }`}
        >
          {task.title}
        </p>
        {task.description && !done && (
          <p
            title={task.description}
            className="text-xs text-muted leading-relaxed line-clamp-2 break-words overflow-hidden text-ellipsis"
          >
            {task.description}
          </p>
        )}
        {(task.checklist?.length ?? 0) > 0 && !done && (
          <ChecklistProgress items={task.checklist ?? []} />
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold"
            style={{ color }}
            title={t.priorities[task.priority]}
          >
            P{task.priority}
          </span>
          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                overdue ? "text-danger font-semibold" : "text-muted"
              }`}
            >
              <CalendarDays size={12} />
              {shortDateLabel(task.due_date, today, lang)}
              {task.due_time ? ` · ${task.due_time}` : ""}
            </span>
          )}
          <TaskListBadge list={list} />
          {task.estimated_hours != null && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-muted tabular-nums"
              title={t.task.estimated}
            >
              <Timer size={12} />
              {formatHours(task.estimated_hours, lang)}
            </span>
          )}
          {task.next_task_id && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-accent"
              title={nextTitle ? `${t.task.nextIs}: ${nextTitle}` : t.task.nextIs}
            >
              <Link2 size={12} />
              <span className="truncate max-w-[140px]">{nextTitle ?? t.task.chained}</span>
            </span>
          )}
        </div>
      </div>
      </div>

      {/* Acciones */}      <div
        className={
          stacked
            ? "flex w-full items-center justify-end gap-0.5 border-t border-white/10 pt-2"
            : "flex shrink-0 items-center gap-0.5"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {extraActions}
        <FocusStartModal
          lists={lists}
          tasks={tasks}
          defaultTaskId={task.id}
          trigger={
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-accent hover:bg-accent/15 transition-colors"
              title={`${t.focus.start}: ${task.title}`}
            >
              <Timer size={15} />
            </span>
          }
        />
        {chain && (
          <button
            type="button"
            aria-label={`${t.chains.view}: ${chain.name}`}
            title={`${t.chains.view}: ${chain.name}`}
            onClick={() => setShowPipeline(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-accent hover:bg-accent/15 transition-colors cursor-pointer"
          >
            <Workflow size={15} />
          </button>
        )}
        <TaskFormModal
          lists={lists}
          tasks={tasks}
          initial={task}
          trigger={
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 transition-colors"
              title={`${t.task.editAria} ${task.title}`}
            >
              <Pencil size={15} />
            </span>
          }
        />
        <DeleteModal
          title={t.task.deleteTitle}
          message={`«${task.title}» ${t.task.deleteMsg}`}
          ariaLabel={`${t.task.deleteTitle}: ${task.title}`}
          onConfirm={async () => {
            await deleteTask(task.id);
          }}
        />
      </div>
    </div>

      {/* Siguiente paso sugerido al completar una tarea encadenada */}
      <GlassModal
        isOpen={!!nextInfo && !showPipeline}
        onClose={closeNext}
        maxWidth="sm"
        hideHeaderDivider={true}
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/25 shadow-xs">
            <CheckCircle2 size={32} />
          </span>
          <div className="flex flex-col gap-1.5 max-w-xs">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t.task.stepDone}
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              {t.task.nextSuggested} <strong className="text-foreground">{nextInfo?.title}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3 w-full pt-3">
            <Button
              fullWidth
              variant="secondary"
              className="rounded-xl h-10 font-medium glass-btn"
              onPress={closeNext}
            >
              {t.task.keepGoing}
            </Button>
            {chain && (
              <Button
                fullWidth
                variant="primary"
                className="rounded-xl h-10 font-semibold shadow-xs"
                onPress={() => setShowPipeline(true)}
              >
                <span className="flex items-center gap-1.5">
                  {t.task.viewChain} <ArrowRight size={15} />
                </span>
              </Button>
            )}
          </div>
        </div>
      </GlassModal>

      {chain && showPipeline && (
        <ChainPipelineModal
          isOpen={showPipeline}
          onClose={closeNext}
          chain={chain}
          lists={lists}
          tasks={tasks}
        />
      )}

      <TaskDetailModal
        task={task}
        list={list}
        lists={lists}
        tasks={tasks}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
});


function ChecklistProgress({ items }: { items: { id: string; text: string; done: boolean }[] }) {
  const done = items.filter((it) => it.done).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted">
      <span className="h-1 w-14 overflow-hidden rounded-full bg-white/20 dark:bg-white/10">
        <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">{done}/{items.length}</span>
    </span>
  );
}
