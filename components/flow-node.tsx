"use client";

import { memo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Button, Spinner } from "@heroui/react";
import { ArrowDown, ArrowRight, Check, Pencil, RotateCcw, Timer } from "lucide-react";
import { ListIcon } from "@/components/list-icon";
import { TaskFormModal, priorityColor } from "@/components/task-form-modal";
import { useLang } from "@/components/language";
import type { Task, TaskList } from "@/lib/types";
import { toggleTaskStatus } from "@/actions/tasks";
import { shortDateLabel, toLocalISODate, formatHours } from "@/lib/dates";

const TaskDetailModal = dynamic(
  () => import("@/components/task-detail-modal").then((m) => m.TaskDetailModal),
  { ssr: false }
);

/**
 * Nodo de flujo réplica del ChainNode de habits/hoy:
 * icono + badge de estado, título, footer con fecha y acciones
 * completar/desmarcar/editar. Clic abre el detalle.
 */
export const FlowNode = memo(function FlowNode({
  task,
  list,
  lists,
  tasks,
  isCurrentTarget = false,
}: {
  task: Task;
  list: TaskList | null | undefined;
  lists: TaskList[];
  tasks: Task[];
  isCurrentTarget?: boolean;
}) {
  const { lang, t } = useLang();
  const [done, setDone] = useState(task.status === "completed");
  const [pending, startTransition] = useTransition();
  const [detailOpen, setDetailOpen] = useState(false);
  const today = toLocalISODate();
  const color = list?.color ?? priorityColor(task.priority);

  function handleToggle() {
    const prev = done;
    setDone(!prev);
    startTransition(async () => {
      const res = await toggleTaskStatus(task.id);
      if (res?.error) setDone(prev);
    });
  }

  const borderGlow = pending
    ? "border-accent/40 shadow-xs opacity-60 pointer-events-none select-none"
    : done
      ? "border-success/60 bg-success/5 shadow-[0_0_24px_-6px_rgba(22,163,74,0.35)]"
      : isCurrentTarget
        ? "shadow-lg ring-1 ring-white/10"
        : "border-border/50 hover:border-border/80";

  const currentStyle =
    isCurrentTarget && !done
      ? { borderColor: color, boxShadow: `0 0 25px -4px ${color}35` }
      : undefined;

  return (
    <>
      <div
        style={currentStyle}
        onClick={() => setDetailOpen(true)}
        className={`w-full rounded-2xl border transition-all duration-300 p-4 relative overflow-hidden backdrop-blur-md bg-surface/90 dark:bg-zinc-900/90 cursor-pointer ${borderGlow}`}
      >
        {/* Header: icono + estado */}
        <div className="flex items-center justify-between gap-3 mb-2.5 relative">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform"
            style={{ backgroundColor: color + "35", color }}
          >
            <ListIcon icon={list?.icon ?? "folder"} size={18} />
          </span>
          {pending ? (
            <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
              <Spinner size="sm" color="current" className="w-3.5 h-3.5" />
            </span>
          ) : done ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/30 uppercase tracking-wider">
              <Check size={12} strokeWidth={2.5} />
              <span>{t.all.doneSing}</span>
            </span>
          ) : (
            <span
              className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              {t.all.pending}
            </span>
          )}
        </div>

        {/* Título + lista */}
        <div className="min-w-0 relative">
          <p className="truncate text-[15px] font-semibold text-foreground">{task.title}</p>
          {list && <p className="text-xs text-muted truncate mt-0.5">{list.name}</p>}
        </div>

        {/* Footer: fecha/P + acciones */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between gap-2 relative"
        >
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <strong className="font-semibold shrink-0" style={{ color: priorityColor(task.priority) }}>
              P{task.priority}
            </strong>
            {task.due_date ? (
              <span className="truncate">
                · {shortDateLabel(task.due_date, today, lang)}{task.due_time ? ` · ${task.due_time}` : ""}
              </span>
            ) : (
              <span className="shrink-0">· {t.chains.noDate}</span>
            )}
            {task.estimated_hours != null && (
              <span className="inline-flex shrink-0 items-center gap-1 tabular-nums" title={t.task.estimated}>
                <Timer size={11} /> {formatHours(task.estimated_hours, lang)}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {done ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={`${t.task.markPending}: ${task.title}`}
                className="h-7 w-7 text-muted hover:text-foreground hover:bg-default/20 rounded-lg"
                isDisabled={pending}
                onPress={handleToggle}
              >
                <RotateCcw size={14} />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`${t.task.markDone}: ${task.title}`}
                className="h-7 px-2 text-xs font-semibold text-success hover:bg-success/10 rounded-lg"
                isDisabled={pending}
                onPress={handleToggle}
              >
                <Check size={14} strokeWidth={2.5} />
              </Button>
            )}
            <TaskFormModal
              lists={lists}
              tasks={tasks}
              initial={task}
              trigger={
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 transition-colors"
                  title={`${t.task.editAria}: ${task.title}`}
                >
                  <Pencil size={14} />
                </span>
              }
            />
          </span>
        </div>
      </div>

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


/** GhostRun: tramo de linea con los iconos encima y flecha al final (si sigue un nodo). */
export function GhostRun({ items, lists, tasks, hasNext, hasPrev = false }: { items: { task: Task; list: TaskList | null | undefined; hiddenDone: boolean }[]; lists: TaskList[]; tasks: Task[]; hasNext: boolean; hasPrev?: boolean }) {
  const allDone = items.length > 0 && items.every((it) => it.task.status === "completed");
  const lineCls = `transition-colors duration-300 ${allDone ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.7)]" : "bg-zinc-400 dark:bg-zinc-500"}`;
  const arrowCls = `transition-colors duration-300 ${allDone ? "text-success drop-shadow-[0_0_6px_rgba(22,163,74,0.5)]" : "text-zinc-400 dark:text-zinc-500"}`;

  return (
    <span className="flex flex-col md:flex-row items-center shrink-0 select-none">
      <span className="hidden md:flex items-center shrink-0">
        {hasPrev && <span aria-hidden className={`h-[2px] w-6 ${lineCls}`} />}
        {items.map(({ task, list, hiddenDone }, i) => (
          <span key={task.id} className="flex items-center shrink-0">
            <GhostIcon task={task} list={list} lists={lists} tasks={tasks} hiddenDone={hiddenDone} compact />
            {(i < items.length - 1 || hasNext) && (
              <span aria-hidden className={`h-[2px] w-6 ${lineCls}`} />
            )}
          </span>
        ))}
        {hasNext ? (
          <ArrowRight size={18} strokeWidth={2.5} aria-hidden className={`-ml-1 shrink-0 ${arrowCls}`} />
        ) : null}
      </span>
      <span className="flex md:hidden flex-col items-center shrink-0">
        {hasPrev && <span aria-hidden className={`w-[2px] h-5 ${lineCls}`} />}
        {items.map(({ task, list, hiddenDone }, i) => (
          <span key={task.id} className="flex flex-col items-center">
            <GhostIcon task={task} list={list} lists={lists} tasks={tasks} hiddenDone={hiddenDone} />
            {(i < items.length - 1 || hasNext) && (
              <span aria-hidden className={`w-[2px] h-5 ${lineCls}`} />
            )}
          </span>
        ))}
        {hasNext ? (
          <ArrowDown size={18} strokeWidth={2.5} aria-hidden className={`-mt-1 ${arrowCls}`} />
        ) : (
          <span aria-hidden className="h-1 shrink-0" />
        )}
      </span>
    </span>
  );
}

function GhostIcon({ task, list, lists, tasks, hiddenDone, compact = false }: { task: Task; list: TaskList | null | undefined; lists: TaskList[]; tasks: Task[]; hiddenDone: boolean; compact?: boolean }) {
  const { t } = useLang();
  const [detailOpen, setDetailOpen] = useState(false);
  const color = hiddenDone ? "#22c55e" : list?.color;

  return (
    <>
      <button
        type="button"
        aria-label={`${t.task.openDetail}: ${task.title}`}
        title={task.title}
        onClick={() => setDetailOpen(true)}
        className={`flex items-center justify-center rounded-full border border-dashed bg-surface dark:bg-zinc-900 text-muted hover:text-foreground transition-colors shadow-xs ${compact ? "h-8 w-8" : "h-9 w-9"}`}
        style={color ? { borderColor: color, color } : undefined}
      >
        {hiddenDone ? <Check size={compact ? 14 : 15} strokeWidth={2.5} /> : <ListIcon icon={list?.icon ?? "folder"} size={compact ? 14 : 15} />}
      </button>
      <TaskDetailModal task={task} list={list} lists={lists} tasks={tasks} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  );
}
