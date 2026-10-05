"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Spinner } from "@heroui/react";
import { Play, Timer } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { SearchableSelect } from "@/components/searchable-select";
import { useLang } from "@/components/language";
import { useFocus } from "@/components/focus-provider";
import { startFocus } from "@/actions/focus";
import type { Task, TaskList } from "@/lib/types";

/**
 * Modal "Enfocarme": elige la tarea (opcional) e inicia el timer.
 * El bloque aparece en la semana desde el inicio y crece en vivo.
 */
export function FocusStartModal({
  lists,
  tasks,
  defaultTaskId = null,
  trigger,
  triggerLabel,
}: {
  lists: TaskList[];
  tasks: Task[];
  defaultTaskId?: string | null;
  trigger?: React.ReactNode;
  triggerLabel?: string;
}) {
  const { t } = useLang();
  const { refresh } = useFocus();
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(defaultTaskId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const options = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "completed")
        .map((t) => {
          const l = lists.find((x) => x.id === t.list_id);
          return { id: t.id, label: t.title, sublabel: l?.name, color: l?.color, icon: l?.icon };
        }),
    [tasks, lists]
  );

  function open() {
    setTaskId(defaultTaskId);
    setError(undefined);
    setIsOpen(true);
  }

  function handleStart() {
    const fd = new FormData();
    fd.set("task_id", taskId || "");
    startTransition(async () => {
      setError(undefined);
      const res = await startFocus(fd);
      if (res?.error) {
        setError(t.focus.startFail);
      } else {
        setIsOpen(false);
        refresh();
      }
    });
  }

  return (
    <>
      {trigger ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={t.focus.start}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") open();
          }}
          className="inline-flex cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onPress={open}
          className="rounded-xl font-semibold shadow-xs"
        >
          <Play size={15} className="mr-1" />
          {triggerLabel ?? t.focus.start}
        </Button>
      )}

      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t.focus.startTitle}
        subtitle={t.focus.startSubtitle}
        icon={<Timer size={20} />}
        maxWidth="sm"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl font-medium glass-btn"
              onPress={() => setIsOpen(false)}
              isDisabled={pending}
            >
              {t.del.cancel}
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="rounded-xl font-semibold px-4 shadow-xs"
              onPress={handleStart}
              isDisabled={pending}
            >
              {pending ? (
                <span className="flex items-center gap-1.5">
                  <Spinner size="sm" color="current" />
                </span>
              ) : (
                t.focus.startNow
              )}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SearchableSelect
            label={t.focus.pickTask}
            placeholder={t.focus.noTask}
            emptyLabel={t.focus.noTask}
            searchPlaceholder={t.task.searchTask}
            options={options}
            value={taskId}
            onChange={setTaskId}
            allowClear={true}
          />
          {error && (
            <p aria-live="polite" className="text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      </GlassModal>
    </>
  );
}
