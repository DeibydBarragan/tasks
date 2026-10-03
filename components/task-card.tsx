"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowRight, CalendarDays, Check, CheckCircle2, Link2, Pencil } from "lucide-react";
import type { Task, TaskList } from "@/lib/types";
import { toggleTaskStatus, deleteTask } from "@/actions/tasks";
import { DeleteModal } from "@/components/delete-modal";
import { GlassModal } from "@/components/glass-modal";
import { ChainPipelineModal } from "@/components/chain-pipeline-modal";
import { buildTaskChains, findChainForTask } from "@/lib/chains";
import { TaskFormModal, TaskListBadge, priorityMeta } from "@/components/task-form-modal";
import { isOverdueISO, shortDateLabel, toLocalISODate } from "@/lib/dates";

export function TaskCard({
  task,
  list,
  lists,
  tasks,
  nextTitle,
  extraActions,
}: {
  task: Task;
  list: TaskList | null | undefined;
  lists: TaskList[];
  tasks: Task[];
  nextTitle?: string | null;
  extraActions?: React.ReactNode;
}) {
  const [done, setDone] = useState(task.status === "completed");
  const [pending, startTransition] = useTransition();
  const [nextInfo, setNextInfo] = useState<{ id: string; title: string } | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const today = toLocalISODate();
  const meta = priorityMeta(task.priority);
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
      className={`flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-all ${
        done ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox redondeado */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? "Marcar como pendiente" : "Marcar como completada"}
        onClick={handleToggle}
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
          <p className="text-xs text-muted leading-relaxed line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold"
            style={{ color: meta.color }}
            title={meta.label}
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
              {shortDateLabel(task.due_date, today)}
              {task.due_time ? ` · ${task.due_time}` : ""}
            </span>
          )}
          <TaskListBadge list={list} />
          {task.next_task_id && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-accent"
              title={nextTitle ? `Siguiente: ${nextTitle}` : "Tiene tarea siguiente"}
            >
              <Link2 size={12} />
              <span className="truncate max-w-[140px]">{nextTitle ?? "Encadenada"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5">
        {extraActions}
        <TaskFormModal
          lists={lists}
          tasks={tasks}
          initial={task}
          trigger={
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 transition-colors"
              title={`Editar ${task.title}`}
            >
              <Pencil size={15} />
            </span>
          }
        />
        <DeleteModal
          title="Eliminar tarea"
          message={`«${task.title}» se eliminará para siempre.`}
          ariaLabel={`Eliminar ${task.title}`}
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
              Paso completado
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Siguiente paso sugerido: <strong className="text-foreground">{nextInfo?.title}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3 w-full pt-3">
            <Button
              fullWidth
              variant="secondary"
              className="rounded-xl h-10 font-medium glass-btn"
              onPress={closeNext}
            >
              Seguir
            </Button>
            {chain && (
              <Button
                fullWidth
                variant="primary"
                className="rounded-xl h-10 font-semibold shadow-xs"
                onPress={() => setShowPipeline(true)}
              >
                <span className="flex items-center gap-1.5">
                  Ver cadena <ArrowRight size={15} />
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
        />
      )}
    </>
  );
}
