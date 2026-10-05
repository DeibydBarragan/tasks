"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { FocusManualModal } from "@/components/focus-manual-modal";
import { FocusStartModal } from "@/components/focus-start-modal";
import { FocusTabs } from "@/components/focus-tabs";
import { formatElapsed, useFocus } from "@/components/focus-provider";
import { useLang } from "@/components/language";
import { FadeIn } from "@/components/animated";
import { deleteSession } from "@/actions/focus";
import type { Task, TaskList } from "@/lib/types";
import { formatHours, monthYearLabel } from "@/lib/dates";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { FocusSessionRow } from "@/components/focus-week";

function weekdayNames(lang: Lang): string[] {
  if (lang === "en") return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
}

function monthCells(year: number, month: number): (string | null)[] {
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

function secsOf(s: FocusSessionRow, now: number): number {
  if (s.duration_seconds != null && s.ended_at) return s.duration_seconds;
  const end = s.ended_at ? new Date(s.ended_at).getTime() : now;
  return Math.max(0, Math.floor((end - new Date(s.started_at).getTime()) / 1000));
}

export function FocusCalendar({
  lists,
  tasks,
  today,
}: {
  lists: TaskList[];
  tasks: Task[];
  today: string;
}) {
  const { lang, t } = useLang();
  const { refresh: refreshPill } = useFocus();
  const [ym, setYm] = useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)) - 1,
  }));
  const [sessions, setSessions] = useState<FocusSessionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const cells = useMemo(() => monthCells(ym.y, ym.m), [ym]);

  const fetchMonth = useCallback(async () => {
    try {
      const from = new Date(ym.y, ym.m, 1);
      const to = new Date(ym.y, ym.m + 1, 1);
      const res = await fetch(
        `/api/focus/range?from=${from.toISOString()}&to=${to.toISOString()}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { sessions: FocusSessionRow[] };
      setSessions(json.sessions);
    } catch {
      // conserva
    }
  }, [ym]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMonth();
  }, [fetchMonth]);

  const hasRunning = sessions.some((s) => !s.ended_at);
  useEffect(() => {
    if (!hasRunning) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [hasRunning]);

  const byDate = useMemo(() => {
    const map = new Map<string, FocusSessionRow[]>();
    for (const s of sessions) {
      const k = dayKeyLocal(s.started_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [sessions]);

  function dayKeyLocal(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function shift(delta: number) {
    setYm((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const selectedTasks = useMemo(
    () =>
      selected
        ? ((byDate.get(selected) ?? []).slice().sort(
            (a, b) => +new Date(a.started_at) - +new Date(b.started_at)
          ) as FocusSessionRow[])
        : [],
    [selected, byDate]
  );
  const selectedTotal = selectedTasks.reduce((acc, s) => acc + secsOf(s, now), 0);

  const WEEKDAYS = weekdayNames(lang);
  const monthTotal = sessions.reduce((acc, s) => acc + secsOf(s, now), 0);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.focus.calendar}</h1>
            <p className="mt-1 text-sm text-muted">
              {t.focus.total}: {formatHours(monthTotal / 3600, lang)}
            </p>
          </div>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t.calendar.prevMonth}
                onClick={() => shift(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl glass-btn text-muted hover:text-foreground cursor-pointer"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}
                className="h-9 rounded-xl glass-btn px-3 text-xs font-semibold text-muted hover:text-foreground cursor-pointer capitalize"
              >
                {monthYearLabel(ym.y, ym.m, lang)}
              </button>
              <button
                type="button"
                aria-label={t.calendar.nextMonth}
                onClick={() => shift(1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl glass-btn text-muted hover:text-foreground cursor-pointer"
              >
                <ChevronRight size={17} />
              </button>
            </span>
            <FocusManualModal
              lists={lists}
              tasks={tasks}
              onDone={() => {
                fetchMonth();
                refreshPill();
              }}
            />
            <FocusStartModal lists={lists} tasks={tasks} />
          </span>
        </div>
      </FadeIn>

      <FocusTabs />

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
              const daySessions = byDate.get(iso) ?? [];
              const total = daySessions.reduce((acc, s) => acc + secsOf(s, now), 0);
              const isToday = iso === today;
              const isSelected = iso === selected;
              const dayNum = Number(iso.slice(8, 10));
              // Color de la lista dominante del día
              const byList = new Map<string, { secs: number; color: string }>();
              for (const s of daySessions) {
                const key = s.list_id ?? "none";
                const cur = byList.get(key) ?? { secs: 0, color: s.task_lists?.color ?? "#64748B" };
                cur.secs += secsOf(s, now);
                byList.set(key, cur);
              }
              const sortedLists = [...byList.values()].sort((a, b) => b.secs - a.secs);
              const dominant = sortedLists[0]?.color;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  aria-label={`${dayNum}: ${formatHours(total / 3600, lang)}`}
                  className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl p-1.5 transition-all sm:min-h-16 ${
                    isSelected
                      ? "bg-accent/15 ring-2 ring-accent"
                      : "hover:bg-white/20 dark:hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                      isToday ? "bg-accent text-accent-foreground" : "text-foreground"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {total > 0 && (
                    <>
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: dominant }}
                      >
                        {formatHours(total / 3600, lang)}
                      </span>
                      <span className="flex h-1 w-10 overflow-hidden rounded-full bg-white/15">
                        {sortedLists.map((l, li) => (
                          <span
                            key={li}
                            style={{
                              width: `${total > 0 ? (l.secs / total) * 100 : 0}%`,
                              backgroundColor: l.color,
                            }}
                          />
                        ))}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </FadeIn>

      <GlassModal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setConfirmDelete(null);
        }}
        title={t.focus.daySessions}
        subtitle={selected ?? ""}
        maxWidth="lg"
      >
        {selected && (
          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-muted">
              {t.focus.total}: {formatHours(selectedTotal / 3600, lang)}
            </p>
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-muted">{t.focus.noSessions}</p>
            ) : (
              selectedTasks.map((s) => (
                <div key={s.id} className="flex flex-col gap-1">
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                  <span
                    className="h-8 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.task_lists?.color ?? "var(--accent)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {s.tasks?.title ?? t.focus.noTask}
                      {!s.ended_at && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-danger">
                          · {t.focus.liveBlock}
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-muted tabular-nums">
                      {new Date(s.started_at).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
                      {s.ended_at
                        ? ` – ${new Date(s.ended_at).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                      {" · "}
                      {formatElapsed(secsOf(s, now))}
                    </span>
                  </span>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`${t.focus.deleteSession}: ${s.tasks?.title ?? ""}`}
                    className="h-8 w-8 rounded-xl text-muted hover:text-danger shrink-0"
                    onPress={() => setConfirmDelete(confirmDelete === s.id ? null : s.id)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
                {confirmDelete === s.id && (
                  <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 -mt-1">
                    <span className="flex-1 text-xs font-medium">{t.all.clearAsk}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg h-7 text-xs"
                      onPress={() => setConfirmDelete(null)}
                    >
                      {t.all.no}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="rounded-lg h-7 text-xs font-semibold"
                      onPress={async () => {
                        await deleteSession(s.id);
                        setConfirmDelete(null);
                        fetchMonth();
                        refreshPill();
                      }}
                    >
                      {t.all.confirm}
                    </Button>
                  </div>
                )}
                </div>
              ))
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
}
