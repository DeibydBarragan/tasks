"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spinner } from "@heroui/react";
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
import { formatHours } from "@/lib/dates";
import type { Lang } from "@/lib/i18n/dictionaries";

export type FocusSessionRow = {
  id: string;
  task_id: string | null;
  list_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
  tasks: { title: string } | null;
  task_lists: { name: string; color: string } | null;
};

const ROW_H = 52;

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayShort(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { weekday: "short" }).format(d);
}

function sessionEndMs(s: FocusSessionRow, now: number): number {
  return s.ended_at ? new Date(s.ended_at).getTime() : now;
}

/** Reparte sesiones solapadas en carriles lado a lado (como apps de calendario). */
function layoutLanes(
  arr: FocusSessionRow[],
  now: number
): Map<string, { lane: number; lanes: number }> {
  const sorted = arr.slice().sort((a, b) => +new Date(a.started_at) - +new Date(b.started_at));
  const laneEnd: number[] = [];
  const pos = new Map<string, { lane: number; lanes: number }>();
  const cluster: { id: string; lane: number }[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) pos.set(c.id, { lane: c.lane, lanes });
    cluster.length = 0;
  }

  for (const s of sorted) {
    const start = +new Date(s.started_at);
    const end = Math.max(start + 60000, sessionEndMs(s, now));
    if (start >= clusterEnd && cluster.length > 0) flush();
    let lane = laneEnd.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(end);
    } else {
      laneEnd[lane] = end;
    }
    cluster.push({ id: s.id, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return pos;
}

function sessionSecs(s: FocusSessionRow, now: number): number {
  if (s.duration_seconds != null && s.ended_at) return s.duration_seconds;
  return Math.max(0, Math.floor((sessionEndMs(s, now) - new Date(s.started_at).getTime()) / 1000));
}

export function FocusWeek({
  lists,
  tasks,
  initialSessions,
  initialMonday,
}: {
  lists: TaskList[];
  tasks: Task[];
  initialSessions: FocusSessionRow[];
  initialMonday: string;
}) {
  const { lang, t } = useLang();
  const { refresh: refreshPill } = useFocus();
  const [offset, setOffset] = useState(0);
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<FocusSessionRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slot, setSlot] = useState<{ date: string; start: string; end: string; n: number } | null>(null);

  const monday = useMemo(() => {
    const base = new Date(initialMonday + "T12:00:00");
    base.setDate(base.getDate() + offset * 7);
    return base;
  }, [initialMonday, offset]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [monday]);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(days[0]);
      from.setHours(0, 0, 0, 0);
      const to = new Date(days[6]);
      to.setHours(23, 59, 59, 999);
      // Sesiones que empiezan en la semana + la abierta aunque empezara antes
      const res = await fetch(
        `/api/focus/range?from=${from.toISOString()}&to=${to.toISOString()}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { sessions: FocusSessionRow[] };
      setSessions(json.sessions);
    } catch {
      // conserva
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (offset !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWeek();
    } else {
      setSessions(initialSessions);
    }
  }, [offset, fetchWeek, initialSessions]);

  // Tick para el bloque en vivo + línea "ahora" (cada segundo si hay sesión en curso)
  const hasRunning = sessions.some((s) => !s.ended_at);
  useEffect(() => {
    if (!hasRunning) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [hasRunning]);

  const byDay = useMemo(() => {
    const map = new Map<string, FocusSessionRow[]>();
    for (const d of days) map.set(dayKey(d), []);
    for (const s of sessions) {
      const k = s.started_at.slice(0, 10);
      // Agrupa por fecha local del inicio
      const local = new Date(s.started_at);
      const lk = dayKey(local);
      if (map.has(lk)) map.get(lk)!.push(s);
      else if (map.has(k)) map.get(k)!.push(s);
    }
    return map;
  }, [sessions, days]);

  const dayTotals = useMemo(() => {
    return days.map((d) => {
      const arr = byDay.get(dayKey(d)) ?? [];
      return arr.reduce((acc, s) => acc + sessionSecs(s, now), 0);
    });
  }, [byDay, days, now]);

  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);
  const todayKey = dayKey(new Date());

  function openSlot(day: Date, clientY: number, target: HTMLDivElement) {
    const rect = target.getBoundingClientRect();
    const minutes = Math.max(
      0,
      Math.min(23 * 60 + 59, Math.floor(((clientY - rect.top - 8) / ROW_H) * 60))
    );
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    const endMin = Math.min(23 * 60 + 59, minutes + 60);
    const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
    const em = String(endMin % 60).padStart(2, "0");
    setSlot((prev) => ({
      date: dayKey(day),
      start: `${hh}:${mm}`,
      end: `${eh}:${em}`,
      n: (prev?.n ?? 0) + 1,
    }));
  }

  async function handleDelete(id: string) {
    await deleteSession(id);
    setSelected(null);
    setConfirmDelete(false);
    fetchWeek();
    refreshPill();
  }

  const rangeLabel = `${days[0].getDate()} – ${days[6].getDate()} ${new Intl.DateTimeFormat(lang, { month: "long" }).format(days[6])}`;

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.focus.week}</h1>
            <p className="mt-1 text-sm text-muted capitalize">
              {rangeLabel} · {t.focus.total}: {formatHours(weekTotal / 3600, lang)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t.calendar.prevMonth}
                className="h-9 w-9 rounded-xl glass-btn"
                onPress={() => setOffset((o) => o - 1)}
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 rounded-xl glass-btn px-3 text-xs font-semibold"
                onPress={() => setOffset(0)}
              >
                {t.focus.thisWeek}
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t.calendar.nextMonth}
                className="h-9 w-9 rounded-xl glass-btn"
                onPress={() => setOffset((o) => o + 1)}
              >
                <ChevronRight size={17} />
              </Button>
            </span>
            <FocusManualModal
              lists={lists}
              tasks={tasks}
              forcePreset={slot}
              onDone={() => {
                fetchWeek();
                refreshPill();
              }}
            />
            <FocusStartModal
              lists={lists}
              tasks={tasks}
              triggerLabel={t.focus.start}
            />
          </div>
        </div>
      </FadeIn>

      <FocusTabs />

      <FadeIn delay={0.05}>
        <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-border bg-surface w-full max-w-full">
          <div className="min-w-[720px]">
            {/* Cabecera de días */}
            <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <span />
              {days.map((d, i) => {
                const k = dayKey(d);
                const isToday = k === todayKey;
                return (
                  <div key={k} className="px-1 py-2 text-center">
                    <p className={`text-[11px] font-semibold uppercase ${isToday ? "text-accent" : "text-muted"}`}>
                      {weekdayShort(d, lang)}
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${isToday ? "text-accent" : ""}`}>
                      {d.getDate()}
                    </p>
                    <p className="text-[10px] text-muted tabular-nums">
                      {dayTotals[i] > 0 ? formatHours(dayTotals[i] / 3600, lang) : "·"}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Cuerpo */}
            <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              {/* Gutter de horas */}
              <div className="relative" style={{ height: 24 * ROW_H }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <span
                    key={h}
                    className="absolute right-1 text-[10px] text-muted tabular-nums"
                    style={{ top: h * ROW_H - 7 }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              {days.map((d) => {
                const k = dayKey(d);
                const arr = (byDay.get(k) ?? []).slice().sort(
                  (a, b) => +new Date(a.started_at) - +new Date(b.started_at)
                );
                const isToday = k === dayKey(new Date(now));
                const nowMin = (() => {
                  const n = new Date(now);
                  return n.getHours() * 60 + n.getMinutes();
                })();
                const lanes = layoutLanes(arr, now);
                return (
                  <div
                    key={k}
                    onClick={(e) => openSlot(d, e.clientY, e.currentTarget)}
                    className="relative border-l border-border/40 cursor-cell"
                    style={{ height: 24 * ROW_H }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <span
                        key={h}
                        aria-hidden
                        className="absolute left-0 right-0 border-t border-border/30"
                        style={{ top: h * ROW_H }}
                      />
                    ))}
                    {isToday && (
                      <span
                        aria-hidden
                        className="absolute left-0 right-0 z-10 border-t-2 border-danger"
                        style={{ top: (nowMin / 60) * ROW_H }}
                      />
                    )}
                    {arr.map((s) => {
                      const start = new Date(s.started_at);
                      const startMin = start.getHours() * 60 + start.getMinutes();
                      const secs = sessionSecs(s, now);
                      const top = (startMin / 60) * ROW_H + 2;
                      const height = Math.max(30, (secs / 3600) * ROW_H - 4);
                      const color = s.task_lists?.color ?? "var(--accent)";
                      const running = !s.ended_at;
                      const lay = lanes.get(s.id) ?? { lane: 0, lanes: 1 };
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(s);
                          }}
                          className="absolute rounded-xl px-2 py-1 text-left overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
                          style={{
                            top,
                            height,
                            left: `${(lay.lane / lay.lanes) * 100}%`,
                            width: `${100 / lay.lanes}%`,
                            backgroundColor: color + "26",
                            borderLeft: `4px solid ${color}`,
                          }}
                          title={`${s.tasks?.title ?? t.focus.noTask} · ${formatElapsed(secs)}`}
                        >
                          <span className="flex items-center gap-1 text-[11px] font-bold truncate">
                            {running && (
                              <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse shrink-0" />
                            )}
                            <span className="truncate">
                              {s.tasks?.title ?? t.focus.noTask}
                            </span>
                          </span>
                          <span className="block text-[10px] text-muted tabular-nums truncate">
                            {formatElapsed(secs)}
                            {!running && s.task_lists ? ` · ${s.task_lists.name}` : running ? ` · ${t.focus.liveBlock}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Detalle de sesión */}
      <GlassModal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setConfirmDelete(false);
        }}
        title={selected?.tasks?.title ?? t.focus.noTask}
        subtitle={
          selected
            ? `${new Date(selected.started_at).toLocaleString(lang)} · ${formatElapsed(sessionSecs(selected, now))}`
            : ""
        }
        maxWidth="sm"
        footer={
          !confirmDelete ? (
            <Button
              size="sm"
              variant="danger"
              className="rounded-xl font-semibold"
              onPress={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} className="mr-1" />
              {t.focus.deleteSession}
            </Button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium">{t.all.clearAsk}</span>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onPress={() => setConfirmDelete(false)}
              >
                {t.all.no}
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="rounded-xl font-semibold"
                onPress={() => selected && handleDelete(selected.id)}
              >
                {t.all.confirm}
              </Button>
            </span>
          )
        }
      >
        {loading ? (
          <span className="flex justify-center py-4">
            <Spinner size="sm" color="current" />
          </span>
        ) : (
          <p className="text-sm text-muted">
            {selected?.task_lists
              ? `${selected.task_lists.name} · ${formatHours(sessionSecs(selected!, now) / 3600, lang)}`
              : formatHours(selected ? sessionSecs(selected, now) / 3600 : 0, lang)}
          </p>
        )}
      </GlassModal>
    </div>
  );
}

export { mondayOf };
