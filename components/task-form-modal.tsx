"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { CalendarClock, Flag } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { SearchableSelect } from "@/components/searchable-select";
import type { PriorityLevel, Task, TaskList } from "@/lib/types";
import { createTask, updateTask } from "@/actions/tasks";
import { ListIcon } from "@/components/list-icon";

const PRIORITIES: { value: PriorityLevel; label: string; color: string }[] = [
  { value: 1, label: "P1 · Urgente", color: "#EF4444" },
  { value: 2, label: "P2 · Alta", color: "#F97316" },
  { value: 3, label: "P3 · Media", color: "#EAB308" },
  { value: 4, label: "P4 · Baja", color: "#64748B" },
];

export function priorityMeta(p: PriorityLevel) {
  return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[3];
}

export function TaskFormModal({
  lists,
  tasks,
  initial,
  onDone,
  triggerLabel,
  trigger,
  defaultListId,
  defaultDueDate,
  defaultUrgent,
  defaultImportant,
}: {
  lists: TaskList[];
  tasks: Task[];
  initial?: Task;
  onDone?: () => void;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  defaultListId?: string | null;
  defaultDueDate?: string | null;
  defaultUrgent?: boolean;
  defaultImportant?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [listId, setListId] = useState<string | null>(
    initial?.list_id ?? defaultListId ?? null
  );
  const [priority, setPriority] = useState<PriorityLevel>(initial?.priority ?? 4);
  const [urgent, setUrgent] = useState(initial?.is_urgent ?? defaultUrgent ?? false);
  const [important, setImportant] = useState(
    initial?.is_important ?? defaultImportant ?? false
  );
  const [nextTaskId, setNextTaskId] = useState<string | null>(
    initial?.next_task_id ?? null
  );

  const listOptions = useMemo(
    () =>
      lists.map((l) => ({
        id: l.id,
        label: l.name,
        color: l.color,
        icon: l.icon,
      })),
    [lists]
  );

  const nextTaskOptions = useMemo(
    () =>
      tasks
        .filter((t) => t.id !== initial?.id && t.status !== "completed")
        .map((t) => {
          const l = lists.find((x) => x.id === t.list_id);
          return {
            id: t.id,
            label: t.title,
            sublabel: l?.name,
            color: l?.color,
            icon: l?.icon,
          };
        }),
    [tasks, initial?.id, lists]
  );

  function handle(fd: FormData) {
    fd.set("list_id", listId || "");
    fd.set("priority", String(priority));
    fd.set("is_urgent", urgent ? "1" : "");
    fd.set("is_important", important ? "1" : "");
    fd.set("next_task_id", nextTaskId || "");

    startTransition(async () => {
      setError(undefined);
      const res = initial
        ? await updateTask(initial.id, fd)
        : await createTask(fd);
      if (res?.error) {
        setError(
          res.error === "cycle"
            ? "Esa cadena forma un ciclo. Elige otra tarea siguiente."
            : res.error === "needTitle"
              ? "Ponle un título a la tarea."
              : "No se pudo guardar. Inténtalo de nuevo."
        );
      } else {
        setIsOpen(false);
        onDone?.();
      }
    });
  }

  return (
    <>
      {trigger ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={initial ? `Editar ${initial.title}` : "Nueva tarea"}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setIsOpen(true);
          }}
          className="inline-flex cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <Button
          variant={initial ? "ghost" : "primary"}
          size="sm"
          onPress={() => setIsOpen(true)}
          className={initial ? "" : "rounded-xl font-semibold shadow-xs"}
        >
          {triggerLabel ?? (initial ? "Editar" : "Nueva tarea")}
        </Button>
      )}

      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={initial ? "Editar tarea" : "Nueva tarea"}
        subtitle={
          initial
            ? initial.title
            : lists.find((l) => l.id === listId)?.name ?? "¿Qué quieres lograr?"
        }
        icon={<CalendarClock size={20} />}
      >
        <form action={handle} className="flex flex-col gap-4">
          <TextField fullWidth isRequired name="title" defaultValue={initial?.title ?? ""}>
            <Label className="text-xs font-semibold">Título</Label>
            <Input
              placeholder="p. ej. Revisar informe, llamar al banco…"
              spellCheck={false}
              className="mt-1 rounded-xl glass-input"
            />
          </TextField>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-desc" className="text-xs font-semibold">
              Descripción
            </label>
            <textarea
              id="task-desc"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              placeholder="Detalles, enlaces, subtareas… (opcional)"
              spellCheck={false}
              className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <SearchableSelect
              label="Lista"
              placeholder="Sin lista"
              emptyLabel="Sin lista"
              searchPlaceholder="Buscar lista…"
              options={listOptions}
              value={listId}
              onChange={setListId}
              allowClear={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-date" className="text-xs font-semibold">
                Fecha límite
              </label>
              <input
                id="task-date"
                type="date"
                name="due_date"
                defaultValue={initial?.due_date ?? defaultDueDate ?? ""}
                className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-time" className="text-xs font-semibold">
                Hora
              </label>
              <input
                id="task-time"
                type="time"
                name="due_time"
                defaultValue={initial?.due_time ?? ""}
                className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">Prioridad</span>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Prioridad">
              {PRIORITIES.map((p) => {
                const sel = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setPriority(p.value)}
                    className={`flex h-10 items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      sel
                        ? "border border-current ring-1 shadow-xs"
                        : "glass-btn text-muted hover:text-foreground"
                    }`}
                    style={sel ? { color: p.color, borderColor: p.color, backgroundColor: p.color + "22" } : undefined}
                  >
                    <Flag size={13} style={{ color: sel ? p.color : undefined }} />
                    P{p.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">Matriz de Eisenhower</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={urgent}
                onClick={() => setUrgent((v) => !v)}
                className={`rounded-2xl p-3 text-left transition-all cursor-pointer ${
                  urgent
                    ? "border border-red-500/60 bg-red-500/15 ring-1 ring-red-500/30 shadow-xs"
                    : "glass-btn"
                }`}
              >
                <span className={`block text-sm font-semibold ${urgent ? "text-red-500" : "text-foreground"}`}>
                  ¿Es urgente?
                </span>
                <span className="block text-xs text-muted mt-0.5">Requiere atención inmediata</span>
              </button>
              <button
                type="button"
                aria-pressed={important}
                onClick={() => setImportant((v) => !v)}
                className={`rounded-2xl p-3 text-left transition-all cursor-pointer ${
                  important
                    ? "border border-accent bg-accent/20 ring-1 ring-accent/30 shadow-xs"
                    : "glass-btn"
                }`}
              >
                <span className={`block text-sm font-semibold ${important ? "text-accent" : "text-foreground"}`}>
                  ¿Es importante?
                </span>
                <span className="block text-xs text-muted mt-0.5">Aporta a tus metas</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <SearchableSelect
              label="Siguiente tarea al completar (opcional)"
              placeholder="Ninguna"
              emptyLabel="Ninguna"
              searchPlaceholder="Buscar tarea…"
              options={nextTaskOptions}
              value={nextTaskId}
              onChange={setNextTaskId}
              allowClear={true}
            />
          </div>

          {error && (
            <p aria-live="polite" className="text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-4 pb-1">
            <Button
              variant="primary"
              type="submit"
              isDisabled={pending}
              className="rounded-xl px-6 shadow-xs font-semibold"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" color="current" /> Guardando…
                </span>
              ) : initial ? (
                "Guardar cambios"
              ) : (
                "Crear tarea"
              )}
            </Button>
          </div>
        </form>
      </GlassModal>
    </>
  );
}

export function TaskListBadge({ list }: { list: TaskList | null | undefined }) {
  if (!list) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: list.color }}
      />
      <ListIcon icon={list.icon} size={12} />
      <span className="truncate max-w-[120px]">{list.name}</span>
    </span>
  );
}
