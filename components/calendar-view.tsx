"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { TaskFormModal, priorityMeta } from "@/components/task-form-modal";
import { TaskListGroup } from "@/components/today-client";
import { FadeIn } from "@/components/animated";
import type { Task, TaskList } from "@/lib/types";
import { applyTaskFilters } from "@/lib/task-filters";

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function monthCells(year: number, month: number): (string | null)[] {
  // month: 0-11. Semana empieza en lunes.
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    cells.push(`${year}-${m}-${day}`);
  }
  return cells;
}

export function CalendarView({
  lists,
  tasks,
  today,
}: {
  lists: TaskList[];
  tasks: Task[];
  today: string;
}) {
  const [ym, setYm] = useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)) - 1,
  }));
  const [selected, setSelected] = useState<string | null>(null);

  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (!map.has(t.due_date)) map.set(t.due_date, []);
      map.get(t.due_date)!.push(t);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => monthCells(ym.y, ym.m), [ym]);

  const monthLabel = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date(ym.y, ym.m, 1));

  const selectedTasks = useMemo(
    () =>
      selected
        ? applyTaskFilters(byDate.get(selected) ?? [], {
            query: "",
            showCompleted: true,
            sort: "priority",
          })
        : [],
    [selected, byDate]
  );

  const selectedLabel = selected
    ? new Intl.DateTimeFormat("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(selected + "T12:00:00"))
    : "";

  function shift(delta: number) {
    setYm((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function dotColor(t: Task): string {
    const l = t.list_id ? listById.get(t.list_id) : undefined;
    return l?.color ?? priorityMeta(t.priority).color;
  }

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">Calendario</h1>
            <p className="mt-1 text-sm text-muted">
              Toca un día para ver y añadir tareas en esa fecha.
            </p>
          </div>
          <span className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => shift(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl glass-btn text-muted hover:text-foreground cursor-pointer"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() =>
                setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })
              }
              className="h-9 rounded-xl glass-btn px-3 text-xs font-semibold text-muted hover:text-foreground cursor-pointer capitalize"
            >
              {monthLabel}
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => shift(1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl glass-btn text-muted hover:text-foreground cursor-pointer"
            >
              <ChevronRight size={17} />
            </button>
          </span>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
              >
                {w}
              </span>
            ))}
            {cells.map((iso, i) => {
              if (!iso) return <span key={`blank-${i}`} />;
              const dayTasks = byDate.get(iso) ?? [];
              const pending = dayTasks.filter((t) => t.status !== "completed");
              const done = dayTasks.filter((t) => t.status === "completed");
              const isToday = iso === today;
              const isSelected = iso === selected;
              const dayNum = Number(iso.slice(8, 10));
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  aria-label={`${dayNum}: ${pending.length} pendientes, ${done.length} completadas`}
                  className={`flex min-h-14 cursor-pointer flex-col items-center gap-1 rounded-xl p-1.5 transition-all sm:min-h-16 ${
                    isSelected
                      ? "bg-accent/15 ring-2 ring-accent"
                      : "hover:bg-white/20 dark:hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                      isToday
                        ? "bg-accent text-accent-foreground"
                        : pending.length > 0 && iso < today
                          ? "text-danger"
                          : "text-foreground"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <span className="flex h-2 items-center gap-1">
                    {pending.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: dotColor(t) }}
                      />
                    ))}
                    {done.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted opacity-60" />
                    )}
                    {pending.length > 4 && (
                      <span className="text-[9px] text-muted">+{pending.length - 4}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </FadeIn>

      {/* Panel del día seleccionado */}
      <GlassModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Tareas del día` : ""}
        subtitle={selectedLabel}
        maxWidth="lg"
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <TaskFormModal
                lists={lists}
                tasks={tasks}
                defaultDueDate={selected}
                triggerLabel={`Añadir el ${Number(selected.slice(8, 10))}`}
              />
            </div>
            {selectedTasks.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <p className="text-4xl" aria-hidden>○</p>
                <p className="mt-2 font-medium">Día libre</p>
                <p className="mt-1 text-sm text-muted">No hay tareas en esta fecha.</p>
              </div>
            ) : (
              <TaskListGroup tasks={selectedTasks} lists={lists} allTasks={tasks} />
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
}
