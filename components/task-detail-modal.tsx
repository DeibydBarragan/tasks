"use client";

import { useState, useTransition } from "react";
import { Button, Spinner } from "@heroui/react";
import { CalendarDays, Check, Flag, ListTodo, Pencil, Workflow } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { TaskFormModal, TaskListBadge, priorityColor } from "@/components/task-form-modal";
import { ChainPipelineModal } from "@/components/chain-pipeline-modal";
import { buildTaskChains, findChainForTask } from "@/lib/chains";
import { useLang } from "@/components/language";
import type { Task, TaskList } from "@/lib/types";
import { toggleChecklistItem } from "@/actions/tasks";
import { isOverdueISO, shortDateLabel, toLocalISODate } from "@/lib/dates";

/** Detalle completo de la tarea: descripción íntegra + checklist interactivo. */
export function TaskDetailModal({
  task,
  list,
  lists,
  tasks,
  trigger,
  open,
  onClose,
}: {
  task: Task;
  list: TaskList | null | undefined;
  lists: TaskList[];
  tasks: Task[];
  trigger?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
}) {
  const { lang, t } = useLang();
  const [internalOpen, setInternalOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const isOpen = open ?? internalOpen;
  const today = toLocalISODate();
  const items = task.checklist ?? [];
  const doneItems = items.filter((it) => it.done).length;
  const chain =
    task.next_task_id != null
      ? findChainForTask(buildTaskChains(tasks), task.id)
      : null;

  const close = onClose ?? (() => setInternalOpen(false));

  return (
    <>
      {trigger && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`${t.task.openDetail}: ${task.title}`}
          onClick={() => setInternalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setInternalOpen(true);
          }}
          className="inline-flex cursor-pointer"
        >
          {trigger}
        </span>
      )}

      <GlassModal
        isOpen={isOpen && !showPipeline}
        onClose={close}
        title={t.task.detailTitle}
        icon={<ListTodo size={20} />}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-base font-semibold leading-snug">{task.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: priorityColor(task.priority) }}
              >
                <Flag size={12} />
                {t.priorities[task.priority]}
              </span>
              {task.due_date && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] ${
                    task.status !== "completed" && isOverdueISO(task.due_date, today)
                      ? "text-danger font-semibold"
                      : "text-muted"
                  }`}
                >
                  <CalendarDays size={12} />
                  {shortDateLabel(task.due_date, today, lang)}
                  {task.due_time ? ` · ${task.due_time}` : ""}
                </span>
              )}
              <TaskListBadge list={list} />
            </div>
          </div>

          {task.description && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
              {task.description}
            </p>
          )}

          {items.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold">
                {t.task.checklistTitle}
                <span className="ml-1.5 font-normal text-muted tabular-nums">
                  ({doneItems}/{items.length})
                </span>
              </span>
              <div className="flex flex-col gap-1">
                {items.map((it) => (
                  <CheckRow key={it.id} taskId={task.id} item={it} done={task.status === "completed"} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {chain && (
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl glass-btn font-semibold"
                onPress={() => setShowPipeline(true)}
              >
                <Workflow size={14} className="mr-1" />
                {t.task.viewChain}
              </Button>
            )}
            <TaskFormModal
              lists={lists}
              tasks={tasks}
              initial={task}
              trigger={
                <span className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-foreground hover:opacity-90 cursor-pointer">
                  <Pencil size={14} />
                  {t.task.edit}
                </span>
              }
            />
          </div>
        </div>
      </GlassModal>

      {chain && showPipeline && (
        <ChainPipelineModal
          isOpen={showPipeline}
          onClose={() => setShowPipeline(false)}
          chain={chain}
          lists={lists}
          tasks={tasks}
        />
      )}
    </>
  );
}

function CheckRow({
  taskId,
  item,
  done: taskDone,
}: {
  taskId: string;
  item: { id: string; text: string; done: boolean };
  done: boolean;
}) {
  const [done, setDone] = useState(item.done);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const prev = done;
    setDone(!prev);
    startTransition(async () => {
      const res = await toggleChecklistItem(taskId, item.id);
      if (res?.error) setDone(prev);
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={item.text}
      onClick={toggle}
      disabled={pending || taskDone}
      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/20 dark:hover:bg-white/5 cursor-pointer disabled:cursor-default"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
          done ? "border-accent bg-accent text-accent-foreground" : "border-muted"
        }`}
      >
        {pending ? (
          <Spinner size="sm" color="current" className="h-3 w-3" />
        ) : (
          done && <Check size={13} strokeWidth={3} />
        )}
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm ${done ? "line-through text-muted" : ""}`}>
        {item.text}
      </span>
    </button>
  );
}
