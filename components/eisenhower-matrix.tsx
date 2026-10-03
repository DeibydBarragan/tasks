"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, Plus } from "lucide-react";
import { TaskToolbar } from "@/components/task-toolbar";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters } from "@/lib/task-filters";
import { moveTaskQuadrant } from "@/actions/tasks";

type QuadrantKey = "do" | "schedule" | "delegate" | "eliminate";

const QUADRANTS: {
  key: QuadrantKey;
  title: string;
  subtitle: string;
  color: string;
  urgent: boolean;
  important: boolean;
}[] = [
  { key: "do", title: "Hacer ahora", subtitle: "Urgente e importante", color: "#EF4444", urgent: true, important: true },
  { key: "schedule", title: "Programar", subtitle: "Importante, no urgente", color: "#2563EB", urgent: false, important: true },
  { key: "delegate", title: "Delegar", subtitle: "Urgente, no importante", color: "#F59E0B", urgent: true, important: false },
  { key: "eliminate", title: "Eliminar", subtitle: "Ni urgente ni importante", color: "#64748B", urgent: false, important: false },
];

/** Menú rápido para mover una tarea a otro cuadrante. */
function MoveMenu({ task, current }: { task: Task; current: QuadrantKey }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function move(q: (typeof QUADRANTS)[number]) {
    setSaving(true);
    await moveTaskQuadrant(task.id, q.urgent, q.important);
    setSaving(false);
    setOpen(false);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Mover ${task.title} a otro cuadrante`}
        title="Mover a otro cuadrante"
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
            {QUADRANTS.filter((q) => q.key !== current).map((q) => (
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
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("priority");

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const filtered = useMemo(
    () => applyTaskFilters(tasks, { query, showCompleted, sort }),
    [tasks, query, showCompleted, sort]
  );

  const pendingTotal = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Matriz de Eisenhower
            </h1>
            <p className="mt-1 text-sm text-muted">
              {pendingTotal === 0
                ? "Sin pendientes. Todo clasificado."
                : `${pendingTotal} pendiente${pendingTotal === 1 ? "" : "s"} clasificadas por urgencia e importancia.`}
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

      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q, qi) => {
          const inQuadrant = filtered.filter(
            (t) => t.is_urgent === q.urgent && t.is_important === q.important
          );
          return (
            <FadeIn key={q.key} delay={0.05 + qi * 0.04}>
              <section
                className="glass-panel flex min-h-[220px] flex-col gap-3 p-4 sm:p-5"
                aria-label={`${q.title}: ${q.subtitle}`}
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
                          ({inQuadrant.filter((t) => t.status !== "completed").length})
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
                        title={`Añadir tarea: ${q.title}`}
                      >
                        <Plus size={16} />
                      </span>
                    }
                  />
                </header>

                {inQuadrant.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-muted">
                    Vacío. Usa + para añadir aquí.
                  </p>
                ) : (
                  <Stagger className="flex flex-col gap-2.5">
                    {inQuadrant.map((t) => (
                      <StaggerItem key={t.id}>
                        <TaskCard
                          task={t}
                          list={t.list_id ? (listById.get(t.list_id) ?? null) : null}
                          lists={lists}
                          tasks={tasks}
                          nextTitle={t.next_task_id ? byId.get(t.next_task_id)?.title : null}
                          extraActions={<MoveMenu task={t} current={q.key} />}
                        />
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </section>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
