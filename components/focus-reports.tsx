"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FocusManualModal } from "@/components/focus-manual-modal";
import { FocusStartModal } from "@/components/focus-start-modal";
import { FocusTabs } from "@/components/focus-tabs";
import { useFocus } from "@/components/focus-provider";
import { useLang } from "@/components/language";
import { FadeIn } from "@/components/animated";
import type { Task, TaskList } from "@/lib/types";
import { formatHours } from "@/lib/dates";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { FocusSessionRow } from "@/components/focus-week";

type Period = "week" | "month";
type GroupBy = "list" | "task";

function mondayOf(base: Date): Date {
  const x = new Date(base);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function secsOf(s: FocusSessionRow): number {
  if (s.duration_seconds != null && s.ended_at) return s.duration_seconds;
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(s.started_at).getTime()) / 1000));
}

function dayLabel(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { weekday: "short", day: "numeric" }).format(d);
}

export function FocusReports({ lists, tasks }: { lists: TaskList[]; tasks: Task[] }) {
  const { lang, t } = useLang();
  const { refresh: refreshPill } = useFocus();
  const [period, setPeriod] = useState<Period>("week");
  const [groupBy, setGroupBy] = useState<GroupBy>("list");
  const [offset, setOffset] = useState(0);
  const [sessions, setSessions] = useState<FocusSessionRow[]>([]);

  const range = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      const mon = mondayOf(new Date(now.setDate(now.getDate() + offset * 7)));
      const end = new Date(mon);
      end.setDate(end.getDate() + 7);
      return { from: mon, to: end };
    }
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return { from: first, to: end };
  }, [period, offset]);

  const fetchRange = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/focus/range?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { sessions: FocusSessionRow[] };
      setSessions(json.sessions);
    } catch {
      // conserva
    }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRange();
  }, [fetchRange]);

  // Barras: por día (semana) o por tramos de 7 días (mes)
  const bars = useMemo(() => {
    const buckets: { label: string; secs: number }[] = [];
    if (period === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(range.from);
        d.setDate(d.getDate() + i);
        buckets.push({ label: dayLabel(d, lang), secs: 0 });
      }
      for (const s of sessions) {
        const idx = Math.floor((+new Date(s.started_at) - +range.from) / 86400000);
        if (idx >= 0 && idx < 7) buckets[idx].secs += secsOf(s);
      }
    } else {
      const totalDays = Math.round((+range.to - +range.from) / 86400000);
      const weeks = Math.ceil(totalDays / 7);
      for (let w = 0; w < weeks; w++) buckets.push({ label: `W${w + 1}`, secs: 0 });
      for (const s of sessions) {
        const idx = Math.min(weeks - 1, Math.floor((+new Date(s.started_at) - +range.from) / (7 * 86400000)));
        if (idx >= 0) buckets[idx].secs += secsOf(s);
      }
    }
    return buckets;
  }, [sessions, range, period, lang]);

  // Agregado por grupo para el pie
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; color: string; secs: number }>();
    for (const s of sessions) {
      if (groupBy === "list") {
        const key = s.list_id ?? "none";
        const cur = map.get(key) ?? {
          label: s.task_lists?.name ?? t.task.noList,
          color: s.task_lists?.color ?? "#64748B",
          secs: 0,
        };
        cur.secs += secsOf(s);
        map.set(key, cur);
      } else {
        const key = s.task_id ?? "none";
        const listColor = s.task_lists?.color ?? "#64748B";
        const cur = map.get(key) ?? {
          label: s.tasks?.title ?? t.focus.noTask,
          color: listColor,
          secs: 0,
        };
        cur.secs += secsOf(s);
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.secs - a.secs);
  }, [sessions, groupBy, t]);

  const total = groups.reduce((a, g) => a + g.secs, 0);
  const maxBar = Math.max(1, ...bars.map((b) => b.secs));

  // Dona SVG
  const R = 54;
  const C = 2 * Math.PI * R;
  const cum: number[] = [];
  {
    let run = 0;
    for (const g of groups) {
      cum.push(run);
      run += total > 0 ? (g.secs / total) * C : 0;
    }
  }
  const arcs = groups.map((g, i) => {
    const frac = total > 0 ? g.secs / total : 0;
    return { ...g, dash: frac * C, gap: C - frac * C, rot: (cum[i] / C) * 360 - 90 };
  });

  const periodLabel =
    period === "week"
      ? `${range.from.getDate()} – ${range.to.getDate() - 1} ${new Intl.DateTimeFormat(lang, { month: "long" }).format(range.to)}`
      : new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(range.from);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.focus.reports}</h1>
            <p className="mt-1 text-sm text-muted capitalize">
              {periodLabel} · {t.focus.total}: {formatHours(total / 3600, lang)}
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
                {period === "week" ? t.focus.thisWeek : t.focus.thisMonth}
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
              onDone={() => {
                fetchRange();
                refreshPill();
              }}
            />
            <FocusStartModal lists={lists} tasks={tasks} />
          </div>
        </div>
      </FadeIn>

      <FocusTabs />

      <FadeIn delay={0.03}>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "week", label: t.focus.thisWeek },
              { key: "month", label: t.focus.thisMonth },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => {
                setPeriod(p.key);
                setOffset(0);
              }}
              className={`glass-pill px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                period === p.key ? "glass-pill-active" : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
          {(
            [
              { key: "list", label: t.focus.byList },
              { key: "task", label: t.focus.byTask },
            ] as const
          ).map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={groupBy === g.key}
              onClick={() => setGroupBy(g.key)}
              className={`glass-pill px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                groupBy === g.key ? "glass-pill-active" : "text-muted hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {total === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl" aria-hidden>○</p>
          <p className="mt-2 font-medium">{t.focus.noSessions}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Barras */}
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex h-44 items-end gap-2">
              {bars.map((b, i) => (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted tabular-nums">
                    {b.secs > 0 ? formatHours(b.secs / 3600, lang) : ""}
                  </span>
                  <div className="flex h-32 w-full items-end rounded-lg bg-white/10 dark:bg-white/5">
                    <div
                      className="w-full rounded-lg bg-accent transition-all"
                      style={{ height: `${Math.max(b.secs > 0 ? 6 : 0, (b.secs / maxBar) * 100)}%` }}
                    />
                  </div>
                  <span className="truncate text-[10px] text-muted">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dona + leyenda */}
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
            <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0 -rotate-0">
              <circle cx="70" cy="70" r={R} fill="none" strokeWidth="18" className="stroke-white/10 dark:stroke-white/5" />
              {arcs.map((a, i) => (
                <circle
                  key={i}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth="18"
                  strokeDasharray={`${Math.max(a.dash - 2, 0.5)} ${a.gap + 2}`}
                  strokeLinecap="round"
                  transform={`rotate(${a.rot} 70 70)`}
                />
              ))}
              <text x="70" y="66" textAnchor="middle" className="fill-foreground text-sm font-bold">
                {formatHours(total / 3600, lang)}
              </text>
              <text x="70" y="82" textAnchor="middle" className="fill-muted text-[10px]">
                {t.focus.total}
              </text>
            </svg>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 w-full">
              {groups.map((g, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="min-w-0 flex-1 truncate font-medium">{g.label}</span>
                  <span className="text-muted tabular-nums shrink-0">
                    {formatHours(g.secs / 3600, lang)}
                    {total > 0 && ` · ${Math.round((g.secs / total) * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
