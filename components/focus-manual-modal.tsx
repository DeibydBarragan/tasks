"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { SearchableSelect } from "@/components/searchable-select";
import { useLang } from "@/components/language";
import { createManualSession } from "@/actions/focus";
import type { Task, TaskList } from "@/lib/types";

function toLocalInput(d: Date): { date: string; time: string } {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}

/** Crea una sesión manual: tarea + fecha + inicio/fin (ISO calculado en cliente). */
export function FocusManualModal({
  lists,
  tasks,
  defaultDate,
  defaultStart,
  defaultEnd,
  forcePreset,
  onDone,
}: {
  lists: TaskList[];
  tasks: Task[];
  defaultDate?: string;
  defaultStart?: string;
  defaultEnd?: string;
  forcePreset?: { date: string; start: string; end: string; n: number } | null;
  onDone?: () => void;
}) {
  const { t } = useLang();
  const now = useMemo(() => new Date(), []);
  const init = useMemo(() => toLocalInput(now), [now]);
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate ?? init.date);
  const [start, setStart] = useState(defaultStart ?? init.time);
  const [end, setEnd] = useState(defaultEnd ?? init.time);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  // Apertura externa con preset (clic en un hueco de la semana).
  useEffect(() => {
    if (forcePreset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(forcePreset.date);
      setStart(forcePreset.start);
      setEnd(forcePreset.end);
      setError(undefined);
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcePreset?.n]);

  const options = useMemo(
    () =>
      tasks.map((t) => {
        const l = lists.find((x) => x.id === t.list_id);
        return { id: t.id, label: t.title, sublabel: l?.name, color: l?.color, icon: l?.icon };
      }),
    [tasks, lists]
  );

  function open(preset?: { date?: string; start?: string; end?: string }) {
    if (preset?.date) setDate(preset.date);
    if (preset?.start) setStart(preset.start);
    if (preset?.end) setEnd(preset.end);
    setError(undefined);
    setIsOpen(true);
  }

  function withOffset(dateStr: string, timeStr: string): Date {
    // Offset explícito para que Safari/móvil no lo interprete como UTC.
    const offMin = -new Date(`${dateStr}T${timeStr}:00`).getTimezoneOffset();
    const sign = offMin >= 0 ? "+" : "-";
    const abs = Math.abs(offMin);
    const oh = String(Math.floor(abs / 60)).padStart(2, "0");
    const om = String(abs % 60).padStart(2, "0");
    return new Date(`${dateStr}T${timeStr}:00${sign}${oh}:${om}`);
  }

  function handleSave() {
    if (!date || !start || !end) {
      setError(t.focus.saveFail);
      return;
    }
    const started = withOffset(date, start);
    const ended = withOffset(date, end);
    if (!(ended.getTime() > started.getTime())) {
      setError(t.focus.saveFail);
      return;
    }
    const fd = new FormData();
    fd.set("task_id", taskId || "");
    fd.set("started_at", started.toISOString());
    fd.set("ended_at", ended.toISOString());
    fd.set("note", "");
    startTransition(async () => {
      setError(undefined);
      const res = await createManualSession(fd);
      if (res?.error) setError(t.focus.saveFail);
      else {
        setIsOpen(false);
        onDone?.();
      }
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onPress={() => open()}
        className="rounded-xl glass-btn font-semibold"
      >
        <Plus size={15} className="mr-1" />
        {t.focus.manual}
      </Button>

      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t.focus.manualTitle}
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
              onPress={handleSave}
              isDisabled={pending}
            >
              {pending ? <Spinner size="sm" color="current" /> : t.focus.save}
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
          <TextField fullWidth name="mdate">
            <Label className="text-xs font-semibold">{t.focus.date}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-xl glass-input"
            />
          </TextField>
          <div className="grid grid-cols-2 gap-3">
            <TextField fullWidth name="mstart">
              <Label className="text-xs font-semibold">{t.focus.startTime}</Label>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 rounded-xl glass-input tabular-nums"
              />
            </TextField>
            <TextField fullWidth name="mend">
              <Label className="text-xs font-semibold">{t.focus.endTime}</Label>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 rounded-xl glass-input tabular-nums"
              />
            </TextField>
          </div>
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

