"use client";

import { Flame } from "lucide-react";
import type { Streak } from "@/lib/types";

/**
 * Insignia de racha diaria global: +1 por cada día con >= 1 tarea completada.
 * Llama encendida si hoy ya está cubierto, tenue si está pendiente.
 */
export function StreakBadge({ streak }: { streak: Streak }) {
  const unit = streak.current === 1 ? "día" : "días";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted tabular-nums"
      title={`Racha actual: ${streak.current} ${unit}. Récord personal: ${streak.best} ${streak.best === 1 ? "día" : "días"}.`}
    >
      <Flame
        size={14}
        aria-hidden
        className={streak.todayCovered ? "text-accent" : "text-muted opacity-50"}
        fill={streak.todayCovered ? "currentColor" : "none"}
      />
      <strong className="text-foreground">{streak.current}</strong> {unit}
      <span aria-hidden>·</span>
      <span>Récord {streak.best}</span>
    </span>
  );
}
