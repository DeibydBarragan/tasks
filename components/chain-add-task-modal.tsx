"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Flag,
  Link2,
  Plus,
  Workflow,
} from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { SearchableSelect } from "@/components/searchable-select";
import { useLang } from "@/components/language";
import { priorityColor, TaskListBadge } from "@/components/task-form-modal";
import { addTaskToChain } from "@/actions/tasks";
import type { PriorityLevel, Task, TaskChain, TaskList } from "@/lib/types";

const PRIORITY_VALUES: PriorityLevel[] = [1, 2, 3, 4];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  chain: TaskChain;
  position: "start" | "end";
  lists: TaskList[];
  tasks: Task[];
};

export function ChainAddTaskModal({
  isOpen,
  onClose,
  chain,
  position,
  lists,
  tasks,
}: Props) {
  const { t } = useLang();
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const head = chain.tasks[0];
  const tail = chain.tasks[chain.tasks.length - 1];
  const targetReferenceTask = position === "start" ? head : tail;

  // Formulario nueva tarea
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState<string | null>(
    targetReferenceTask?.list_id ?? null
  );
  const [dueDate, setDueDate] = useState<string>(
    targetReferenceTask?.due_date ?? ""
  );
  const [dueTime, setDueTime] = useState<string>(
    targetReferenceTask?.due_time ?? ""
  );
  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [priority, setPriority] = useState<PriorityLevel>(4);
  const [urgent, setUrgent] = useState<boolean>(false);
  const [important, setImportant] = useState<boolean>(false);

  // Tarea existente
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  const eligibleTasks = useMemo(() => {
    const chainIds = new Set(chain.tasks.map((t) => t.id));
    return tasks
      .filter((t) => !chainIds.has(t.id) && t.status !== "completed")
      .map((t) => {
        const l = lists.find((x) => x.id === t.list_id);
        return {
          id: t.id,
          label: t.title,
          sublabel: l?.name,
          color: l?.color,
          icon: l?.icon,
        };
      });
  }, [chain.tasks, tasks, lists]);

  const selectedTaskObj = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  if (!isOpen) return null;

  function handleSubmit() {
    if (tab === "new" && !title.trim()) {
      setError(t.task.needTitle);
      return;
    }
    if (tab === "existing" && !selectedTaskId) {
      setError(t.chains.selectTaskPh);
      return;
    }

    startTransition(async () => {
      setError(undefined);
      let res;
      if (tab === "new") {
        const fd = new FormData();
        fd.set("title", title.trim());
        fd.set("description", description.trim());
        fd.set("list_id", listId || "");
        fd.set("due_date", dueDate || "");
        fd.set("due_time", dueTime || "");
        fd.set("priority", String(priority));
        fd.set("is_urgent", urgent ? "1" : "");
        fd.set("is_important", important ? "1" : "");
        fd.set("estimated_hours", estimatedHours || "");
        fd.set("checklist", "[]");
        fd.set("reminders", "[]");

        res = await addTaskToChain({
          headTaskId: head.id,
          tailTaskId: tail.id,
          position,
          formData: fd,
        });
      } else {
        res = await addTaskToChain({
          headTaskId: head.id,
          tailTaskId: tail.id,
          position,
          existingTaskId: selectedTaskId!,
        });
      }

      if (res?.error) {
        setError(
          res.error === "cycle"
            ? t.task.cycle
            : res.error === "needTitle"
              ? t.task.needTitle
              : t.chains.saveFail
        );
      } else {
        onClose();
      }
    });
  }

  const isStart = position === "start";

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={isStart ? t.chains.addStartTitle : t.chains.addEndTitle}
      subtitle={chain.name}
      icon={<Workflow size={18} className="text-accent" />}
      maxWidth="md"
      footer={
        <>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl font-medium glass-btn"
            onPress={onClose}
            isDisabled={isPending}
          >
            {t.chains.cancel}
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="rounded-xl font-semibold px-4 shadow-xs"
            onPress={handleSubmit}
            isDisabled={isPending || (tab === "existing" && !selectedTaskId)}
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" color="current" />
                <span>{t.chains.saving}</span>
              </span>
            ) : tab === "new" ? (
              t.chains.createAndAdd
            ) : (
              t.chains.linkTask
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Indicador de conexión */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent">
          {isStart ? (
            <ArrowLeftToLine size={18} className="shrink-0" />
          ) : (
            <ArrowRightToLine size={18} className="shrink-0" />
          )}
          <div className="text-xs leading-relaxed min-w-0">
            <span className="font-semibold text-foreground">
              {isStart ? t.chains.addStartSub : t.chains.addEndSub}:
            </span>{" "}
            <span className="font-medium text-accent break-words">
              &ldquo;{targetReferenceTask?.title}&rdquo;
            </span>
          </div>
        </div>

        {/* Selector de pestañas: Nueva tarea / Existente */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface/50 border border-border/50 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab("new");
              setError(undefined);
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === "new"
                ? "bg-accent text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Plus size={13} className="inline mr-1 -mt-0.5" />
            {t.chains.tabNew}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("existing");
              setError(undefined);
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === "existing"
                ? "bg-accent text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Link2 size={13} className="inline mr-1 -mt-0.5" />
            {t.chains.tabExisting}
          </button>
        </div>

        {tab === "new" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-3.5"
          >
            <TextField fullWidth name="title">
              <Label className="text-xs font-semibold">{t.task.title}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.task.titlePh}
                autoFocus
                className="mt-1 rounded-xl glass-input"
              />
            </TextField>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="chain-task-desc" className="text-xs font-semibold">
                {t.task.description}
              </label>
              <textarea
                id="chain-task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.task.descPh}
                rows={2}
                className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none resize-none"
              />
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chain-task-date" className="text-xs font-semibold">
                  {t.task.dueDate}
                </label>
                <input
                  id="chain-task-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chain-task-time" className="text-xs font-semibold">
                  {t.task.time}
                </label>
                <input
                  id="chain-task-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                <label htmlFor="chain-task-est" className="text-xs font-semibold whitespace-nowrap">
                  {t.task.estimatedShort}
                </label>
                <input
                  id="chain-task-est"
                  type="number"
                  min={0}
                  max={999}
                  step={0.5}
                  inputMode="decimal"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none tabular-nums"
                />
              </div>
            </div>

            {/* Prioridades */}
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
                      className={`flex h-9 items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        sel
                          ? "border border-current ring-1 shadow-xs"
                          : "glass-btn text-muted hover:text-foreground"
                      }`}
                      style={sel ? { color, borderColor: color, backgroundColor: color + "22" } : undefined}
                    >
                      <Flag size={12} style={{ color: sel ? color : undefined }} />
                      P{p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matriz Eisenhower */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold">{t.task.matrix}</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={urgent}
                  onClick={() => setUrgent((v) => !v)}
                  className={`rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                    urgent
                      ? "border border-red-500/60 bg-red-500/15 ring-1 ring-red-500/30 shadow-xs"
                      : "glass-btn"
                  }`}
                >
                  <span className={`block text-xs font-semibold ${urgent ? "text-red-500" : "text-foreground"}`}>
                    {t.task.urgentQ}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5">{t.task.urgentHint}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={important}
                  onClick={() => setImportant((v) => !v)}
                  className={`rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                    important
                      ? "border border-accent bg-accent/20 ring-1 ring-accent/30 shadow-xs"
                      : "glass-btn"
                  }`}
                >
                  <span className={`block text-xs font-semibold ${important ? "text-accent" : "text-foreground"}`}>
                    {t.task.importantQ}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5">{t.task.importantHint}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 py-1">
            <SearchableSelect
              label={t.chains.selectTask}
              placeholder={t.chains.selectTaskPh}
              searchPlaceholder={t.task.searchTask}
              options={eligibleTasks}
              value={selectedTaskId}
              onChange={setSelectedTaskId}
              allowClear={true}
            />

            {eligibleTasks.length === 0 && (
              <p className="text-xs text-muted italic p-3 bg-surface/80 rounded-xl border border-border/50 text-center">
                {t.chains.noEligibleTasks}
              </p>
            )}

            {selectedTaskObj && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface/80 border border-border/60">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {t.chains.selectedTaskPreview}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {selectedTaskObj.title}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
                    style={{ backgroundColor: priorityColor(selectedTaskObj.priority) }}
                  >
                    P{selectedTaskObj.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <TaskListBadge list={lists.find((l) => l.id === selectedTaskObj.list_id)} />
                  {selectedTaskObj.due_date && (
                    <span className="text-xs text-muted">
                      📅 {selectedTaskObj.due_date}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p aria-live="polite" className="text-xs text-danger font-medium">
            {error}
          </p>
        )}
      </div>
    </GlassModal>
  );
}
