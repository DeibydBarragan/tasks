"use client";

import { useState, useTransition } from "react";
import { Button, Spinner } from "@heroui/react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { ListIcon } from "@/components/list-icon";
import { TaskFormModal, priorityColor } from "@/components/task-form-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { useLang } from "@/components/language";
import type { Task, TaskList } from "@/lib/types";
import { toggleTaskStatus } from "@/actions/tasks";
import { shortDateLabel, toLocalISODate } from "@/lib/dates";

/**
 * Nodo de flujo réplica del ChainNode de habits/hoy:
 * icono + badge de estado, título, footer con fecha y acciones
 * completar/desmarcar/editar. Clic abre el detalle.
 */
export function FlowNode({
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
          <span className="text-xs text-muted truncate">
            <strong className="font-semibold" style={{ color: priorityColor(task.priority) }}>
              P{task.priority}
            </strong>
            {task.due_date ? (
              <> · {shortDateLabel(task.due_date, today, lang)}{task.due_time ? ` · ${task.due_time}` : ""}</>
            ) : (
              <> · {t.chains.noDate}</>
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
}

/** GhostLink: icono de categoria sobre la flecha para miembros fuera de ambito. */
export function GhostLink({ task, list, lists, tasks, done }: { task: Task; list: TaskList | null | undefined; lists: TaskList[]; tasks: Task[]; done: boolean }) {
  const { t } = useLang();
  const [detailOpen, setDetailOpen] = useState(false);
  const color = list?.color;

  return (
    <>
      <button
        type="button"
        aria-label={`${t.task.openDetail}: ${task.title}`}
        title={task.title}
        onClick={() => setDetailOpen(true)}
        className="group relative flex w-20 md:w-28 shrink-0 items-center justify-center py-3 cursor-pointer select-none"
      >
        <span
          aria-hidden
          className={`h-[2px] w-full transition-colors duration-300 ${done ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.7)]" : "bg-zinc-400 dark:bg-zinc-500"}`}
        />
        <span
          className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-dashed bg-surface dark:bg-zinc-900 text-muted group-hover:text-foreground transition-colors shadow-xs"
          style={color ? { borderColor: color, color } : undefined}
        >
          <ListIcon icon={list?.icon ?? "folder"} size={16} />
        </span>
      </button>

      <TaskDetailModal task={task} list={list} lists={lists} tasks={tasks} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  );
}
