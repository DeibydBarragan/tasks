"use client";

import { useMemo, useState } from "react";
import { ListIcon } from "@/components/list-icon";
import { TaskCard } from "@/components/task-card";
import { useLang } from "@/components/language";
import type { Task, TaskList } from "@/lib/types";
import { moveTaskList } from "@/actions/tasks";

/**
 * Tablero kanban: una columna por lista (+ Sin lista).
 * Arrastrar una tarjeta a otra columna cambia su lista.
 */
export function TaskKanban({
  lists,
  tasks,
}: {
  lists: TaskList[];
  tasks: Task[];
}) {
  const { t } = useLang();
  const [dragOver, setDragOver] = useState<string | null>(null);

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
    const taskId = e.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    const task = byId.get(taskId);
    if (!task) return;
    const targetListId = key === "none" ? null : key;
    if ((task.list_id ?? null) === targetListId) return;
    await moveTaskList(taskId, targetListId);
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
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/task-id", task.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
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
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
