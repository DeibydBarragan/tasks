"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { CalendarClock, Check, Flag, Plus, Trash2 } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { SearchableSelect } from "@/components/searchable-select";
import { useLang } from "@/components/language";
import type { PriorityLevel, Task, TaskList } from "@/lib/types";
import { createTask, updateTask } from "@/actions/tasks";
import { ListIcon } from "@/components/list-icon";

const PRIORITY_VALUES: PriorityLevel[] = [1, 2, 3, 4];

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#EAB308",
  4: "#64748B",
};

export function priorityColor(p: PriorityLevel): string {
  return PRIORITY_COLORS[p] ?? PRIORITY_COLORS[4];
}

/** @deprecated Usa priorityColor + t.priorities[p]. Se mantiene por compatibilidad. */
export function priorityMeta(p: PriorityLevel) {
  return { value: p, color: priorityColor(p) };
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
  const { t } = useLang();
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
  const [items, setItems] = useState<{ id: string; text: string; done: boolean }[]>(
    (initial?.checklist ?? []).map((c) => ({ ...c }))
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
    fd.set("checklist", JSON.stringify(items.filter((it) => it.text.trim().length > 0)));

    startTransition(async () => {
      setError(undefined);
      const res = initial
        ? await updateTask(initial.id, fd)
        : await createTask(fd);
      if (res?.error) {
        setError(
          res.error === "cycle"
            ? t.task.cycle
            : res.error === "needTitle"
              ? t.task.needTitle
              : t.task.saveFail
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
          aria-label={initial ? `${t.task.editAria} ${initial.title}` : t.task.new}
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
          {triggerLabel ?? (initial ? t.task.edit : t.task.new)}
        </Button>
      )}

      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={initial ? t.task.editTitle : t.task.newTitle}
        subtitle={
          initial
            ? initial.title
            : lists.find((l) => l.id === listId)?.name ?? t.task.newSubtitle
        }
        icon={<CalendarClock size={20} />}
      >
        <form action={handle} className="flex flex-col gap-4">
          <TextField fullWidth isRequired name="title" defaultValue={initial?.title ?? ""}>
            <Label className="text-xs font-semibold">{t.task.title}</Label>
            <Input
              placeholder={t.task.titlePh}
              spellCheck={false}
              className="mt-1 rounded-xl glass-input"
            />
          </TextField>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-desc" className="text-xs font-semibold">
              {t.task.description}
            </label>
            <textarea
              id="task-desc"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              placeholder={t.task.descPh}
              spellCheck={false}
              className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">
              {t.task.checklistTitle}
              {items.length > 0 && (
                <span className="ml-1.5 font-normal text-muted tabular-nums">
                  ({items.filter((it) => it.done).length}/{items.length})
                </span>
              )}
            </span>
            {items.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={it.done}
                      aria-label={it.text || t.task.checklistTitle}
                      onClick={() => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, done: !p.done } : p)))}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer ${
                        it.done ? "border-accent bg-accent text-accent-foreground" : "border-muted"
                      }`}
                    >
                      {it.done && <Check size={13} strokeWidth={3} />}
                    </button>
                    <input
                      type="text"
                      value={it.text}
                      maxLength={120}
                      onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, text: e.target.value } : p)))}
                      placeholder={t.task.itemPh}
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-lg glass-input px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted outline-none"
                    />
                    <button
                      type="button"
                      aria-label={t.del.confirm}
                      onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {items.length < 30 && (
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [...prev, { id: `cl_${Date.now()}_${prev.length}`, text: "", done: false }])
                }
                className="self-start rounded-xl glass-btn px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <Plus size={13} className="mr-1 inline" />
                {t.task.addItem}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <SearchableSelect
              label={t.task.list}
              placeholder={t.task.noList}
              emptyLabel={t.task.noList}
              searchPlaceholder={t.task.searchList}
              options={listOptions}
              value={listId}
              onChange={setListId}
              allowClear={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-date" className="text-xs font-semibold">
                {t.task.dueDate}
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
                {t.task.time}
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
            <span className="text-xs font-semibold">{t.task.priority}</span>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={t.task.priority}>
              {PRIORITY_VALUES.map((p) => {
                const sel = priority === p;
                const color = priorityColor(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={sel}
                    aria-label={t.priorities[p]}
                    onClick={() => setPriority(p)}
                    className={`flex h-10 items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      sel
                        ? "border border-current ring-1 shadow-xs"
                        : "glass-btn text-muted hover:text-foreground"
                    }`}
                    style={sel ? { color, borderColor: color, backgroundColor: color + "22" } : undefined}
                  >
                    <Flag size={13} style={{ color: sel ? color : undefined }} />
                    P{p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">{t.task.matrix}</span>
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
                  {t.task.urgentQ}
                </span>
                <span className="block text-xs text-muted mt-0.5">{t.task.urgentHint}</span>
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
                  {t.task.importantQ}
                </span>
                <span className="block text-xs text-muted mt-0.5">{t.task.importantHint}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <SearchableSelect
              label={t.task.next}
              placeholder={t.task.none}
              emptyLabel={t.task.none}
              searchPlaceholder={t.task.searchTask}
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
                  <Spinner size="sm" color="current" /> {t.task.saving}
                </span>
              ) : initial ? (
                t.task.update
              ) : (
                t.task.create
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
