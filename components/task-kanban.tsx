"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "@heroui/react";
import { ListIcon } from "@/components/list-icon";
import { TaskCard } from "@/components/task-card";
import { useLang } from "@/components/language";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { moveTaskList, reorderTasks } from "@/actions/tasks";

/**
 * Tablero kanban: una columna por lista (+ Sin lista).
 * Arrastrar una tarjeta a otra columna cambia su lista.
 */
export function TaskKanban({
  lists,
  tasks,
  sort,
}: {
  lists: TaskList[];
  tasks: Task[];
  sort: SortOption;
}) {
  const { t } = useLang();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overAfter, setOverAfter] = useState(false);
  const [, startReorder] = useTransition();

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const columns = useMemo(() => {
    const cols: { key: string; list: TaskList | null; tasks: Task[] }[] = lists.map((l) => ({
      key: l.id,
      list: l,
      tasks: tasks.filter((task) => task.list_id === l.id),
    }));
    const orphan = tasks.filter((task) => !task.list_id || !listById.has(task.list_id));
    if (orphan.length > 0 || lists.length === 0) {
      cols.push({ key: "none", list: null, tasks: orphan });
    }
    return cols;
  }, [lists, tasks, listById]);

  async function handleDrop(e: React.DragEvent, key: string) {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData("text/task-id") || dragId;
    if (!taskId) return;
    const task = byId.get(taskId);
    if (!task) {
      setDragId(null);
      return;
    }
    const targetListId = key === "none" ? null : key;
    setDragId(null);
    setOverId(null);
    if ((task.list_id ?? null) === targetListId) return;
    await moveTaskList(taskId, targetListId);
  }

  function resetCardDrag() {
    setDragId(null);
    setOverId(null);
    setOverAfter(false);
  }

  // Soltar SOBRE una tarjeta: reordena dentro de la columna si es la misma
  // lista; si no, mueve la tarea a esa lista.
  function handleCardDrop(e: React.DragEvent, targetId: string, columnTasks: Task[]) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const sourceId = dragId;
    const source = sourceId ? byId.get(sourceId) : undefined;
    const target = byId.get(targetId);
    if (!sourceId || !source || !target || sourceId === targetId) {
      resetCardDrag();
      return;
    }
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    if ((source.list_id ?? null) !== (target.list_id ?? null)) {
      resetCardDrag();
      startReorder(async () => {
        await moveTaskList(sourceId, target.list_id);
      });
      return;
    }
    const ids = columnTasks.map((t) => t.id).filter((id) => id !== sourceId);
    const idx = ids.indexOf(targetId) + (after ? 1 : 0);
    ids.splice(idx, 0, sourceId);
    const moved = ids.some((id, i) => columnTasks[i]?.id !== id);
    resetCardDrag();
    if (!moved) return;
    startReorder(async () => {
      const res = await reorderTasks(ids, sort);
      if (res?.error) toast.danger(t.errors.orderConflict);
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-4xl" aria-hidden>○</p>
        <p className="mt-2 font-medium">{t.all.noTasks}</p>
        <p className="mt-1 text-sm text-muted">{t.all.newHint}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar snap-x">
      {columns.map((col) => {
        const pending = col.tasks.filter((t) => t.status !== "completed").length;
        const active = dragOver === col.key;
        return (
          <section
            key={col.key}
            aria-label={col.list?.name ?? t.views.noListCol}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOver !== col.key) setDragOver(col.key);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === col.key ? null : cur))}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`flex w-72 shrink-0 snap-start flex-col gap-2.5 rounded-2xl border p-3 transition-colors ${
              active
                ? "border-accent bg-accent/10"
                : "border-border bg-surface/60 dark:bg-zinc-900/40"
            }`}
          >
            <header className="flex items-center gap-2 px-1">
              {col.list ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.list.color }} />
                  <ListIcon icon={col.list.icon} size={15} />
                  <span className="truncate text-sm font-semibold">{col.list.name}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-muted">{t.views.noListCol}</span>
              )}
              <span className="ml-auto text-[11px] text-muted tabular-nums">({pending})</span>
            </header>
            <div className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5">
              {col.tasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 px-3 py-5 text-center text-[11px] text-muted">
                  —
                </p>
              ) : (
                col.tasks.map((task) => (
                  <div key={task.id}>
                    {overId === task.id && !overAfter && dragId && dragId !== task.id && (
                      <div aria-hidden className="h-0.5 -my-1 rounded-full bg-accent" />
                    )}
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/task-id", task.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(task.id);
                      }}
                      onDragOver={(e) => {
                        if (!dragId || dragId === task.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        setOverId(task.id);
                        setOverAfter(e.clientY > rect.top + rect.height / 2);
                      }}
                      onDrop={(e) => handleCardDrop(e, task.id, col.tasks)}
                      onDragEnd={resetCardDrag}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TaskCard
                        task={task}
                        list={task.list_id ? (listById.get(task.list_id) ?? null) : null}
                        lists={lists}
                        tasks={tasks}
                        nextTitle={task.next_task_id ? byId.get(task.next_task_id)?.title : null}
                      />
                    </div>
                    {overId === task.id && overAfter && dragId && dragId !== task.id && (
                      <div aria-hidden className="h-0.5 -my-1 rounded-full bg-accent" />
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
