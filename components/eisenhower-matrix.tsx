"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, Plus } from "lucide-react";
import { TaskToolbar } from "@/components/task-toolbar";
import { ListPills } from "@/components/list-pills";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { useLang } from "@/components/language";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters, filterByList } from "@/lib/task-filters";
import { moveTaskQuadrant } from "@/actions/tasks";

type QuadrantKey = "do" | "schedule" | "delegate" | "eliminate";

/** Menú rápido para mover una tarea a otro cuadrante. */
function MoveMenu({ task, current, titles }: { task: Task; current: QuadrantKey; titles: { key: QuadrantKey; title: string; color: string; urgent: boolean; important: boolean }[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function move(q: { urgent: boolean; important: boolean }) {
    setSaving(true);
    await moveTaskQuadrant(task.id, q.urgent, q.important);
    setSaving(false);
    setOpen(false);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`${t.matrix.moveTo}: ${task.title}`}
        title={t.matrix.moveTo}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 transition-colors cursor-pointer"
      >
        <ArrowLeftRight size={15} />
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <span className="glass-dropdown absolute right-0 top-9 z-20 flex w-48 flex-col gap-0.5 p-1.5">
            {titles.filter((q) => q.key !== current).map((q) => (
              <button
                key={q.key}
                type="button"
                disabled={saving}
                onClick={() => move(q)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-foreground hover:bg-default/15 transition-colors cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                <span className="flex-1 font-medium">{q.title}</span>
                {saving && <Check size={13} className="text-muted" />}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

export function EisenhowerMatrix({ lists, tasks }: { lists: TaskList[]; tasks: Task[] }) {
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("priority");
  const [listId, setListId] = useState<string | "all">("all");
  const [dragOver, setDragOver] = useState<QuadrantKey | null>(null);

  const QUADRANTS: {
    key: QuadrantKey;
    title: string;
    subtitle: string;
    color: string;
    urgent: boolean;
    important: boolean;
  }[] = [
    { key: "do", title: t.matrix.q1t, subtitle: t.matrix.q1s, color: "#EF4444", urgent: true, important: true },
    { key: "schedule", title: t.matrix.q2t, subtitle: t.matrix.q2s, color: "#2563EB", urgent: false, important: true },
    { key: "delegate", title: t.matrix.q3t, subtitle: t.matrix.q3s, color: "#F59E0B", urgent: true, important: false },
    { key: "eliminate", title: t.matrix.q4t, subtitle: t.matrix.q4s, color: "#64748B", urgent: false, important: false },
  ];

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const filtered = useMemo(
    () =>
      applyTaskFilters(filterByList(tasks, listId), { query, showCompleted, sort, lang }),
    [tasks, listId, query, showCompleted, sort, lang]
  );

  async function handleDrop(e: React.DragEvent, q: (typeof QUADRANTS)[number]) {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    const task = byId.get(taskId);
    if (!task) return;
    if (task.is_urgent === q.urgent && task.is_important === q.important) return;
    await moveTaskQuadrant(taskId, q.urgent, q.important);
  }

  const pendingTotal = tasks.filter((task) => task.status !== "completed").length;

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {t.matrix.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {pendingTotal === 0
                ? t.matrix.empty
                : `${pendingTotal} ${pendingTotal === 1 ? t.matrix.pending : t.matrix.pendingPl} ${t.matrix.classified}`}
            </p>
          </div>
          <TaskFormModal lists={lists} tasks={tasks} />
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

      <FadeIn delay={0.04}>
        <ListPills lists={lists} tasks={tasks} value={listId} onChange={setListId} />
      </FadeIn>

      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q, qi) => {
          const inQuadrant = filtered.filter(
            (task) => task.is_urgent === q.urgent && task.is_important === q.important
          );
          return (
            <FadeIn key={q.key} delay={0.05 + qi * 0.04}>
              <section
                className={`glass-panel flex min-h-[220px] flex-col gap-3 p-4 sm:p-5 transition-colors ${
                  dragOver === q.key ? "ring-2 ring-accent" : ""
                }`}
                aria-label={`${q.title}: ${q.subtitle}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOver !== q.key) setDragOver(q.key);
                }}
                onDragLeave={() => setDragOver((cur) => (cur === q.key ? null : cur))}
                onDrop={(e) => handleDrop(e, q)}
              >
                <header className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-bold text-sm"
                      style={{
                        color: q.color,
                        borderColor: q.color + "55",
                        backgroundColor: q.color + "1A",
                      }}
                    >
                      Q{qi + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {q.title}
                        <span className="ml-1.5 text-[11px] font-normal text-muted tabular-nums">
                          ({inQuadrant.filter((task) => task.status !== "completed").length})
                        </span>
                      </span>
                      <span className="block truncate text-[11px] text-muted">{q.subtitle}</span>
                    </span>
                  </span>
                  <TaskFormModal
                    lists={lists}
                    tasks={tasks}
                    defaultUrgent={q.urgent}
                    defaultImportant={q.important}
                    trigger={
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-dashed text-muted hover:text-foreground transition-colors"
                        style={{ borderColor: q.color + "66" }}
                        title={`${t.matrix.addHere}: ${q.title}`}
                      >
                        <Plus size={16} />
                      </span>
                    }
                  />
                </header>

                {inQuadrant.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-muted">
                    {t.matrix.emptyQ}
                  </p>
                ) : (
                  <div className="max-h-[290px] overflow-y-auto custom-scrollbar pr-1 -mr-1">
                    <Stagger className="flex flex-col gap-2.5">
                      {inQuadrant.map((t) => (
                        <StaggerItem key={t.id}>
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/task-id", t.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <TaskCard
                              task={t}
                              list={t.list_id ? (listById.get(t.list_id) ?? null) : null}
                              lists={lists}
                              tasks={tasks}
                              nextTitle={t.next_task_id ? byId.get(t.next_task_id)?.title : null}
                              extraActions={<MoveMenu task={t} current={q.key} titles={QUADRANTS} />}
                            />
                          </div>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </div>
                )}
              </section>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
