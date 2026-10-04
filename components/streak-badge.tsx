"use client";

import { Flame } from "lucide-react";
import type { Streak } from "@/lib/types";
import { useLang } from "@/components/language";

/**
 * Insignia de racha diaria global: +1 por cada día con >= 1 tarea completada.
 * Llama encendida si hoy ya está cubierto, tenue si está pendiente.
 */
export function StreakBadge({ streak }: { streak: Streak }) {
  const { t } = useLang();
  const unit = streak.current === 1 ? t.streak.day : t.streak.days;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted tabular-nums"
      title={`${t.streak.tooltip}: ${streak.current} ${unit}. ${t.streak.record}: ${streak.best}.`}
    >
      <Flame
        size={14}
        aria-hidden
        className={streak.todayCovered ? "text-accent" : "text-muted opacity-50"}
        fill={streak.todayCovered ? "currentColor" : "none"}
      />
      <strong className="text-foreground">{streak.current}</strong> {unit}
      <span aria-hidden>·</span>
      <span>{t.streak.record} {streak.best}</span>
    </span>
  );
}
