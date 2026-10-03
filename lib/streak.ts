import { Streak } from "./types";

function prevDayISO(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula la racha diaria global basada en fechas donde se completó >= 1 tarea.
 *
 * @param completedDatesSet Conjunto de strings "YYYY-MM-DD" con actividad completada.
 * @param todayISO Fecha local actual en formato "YYYY-MM-DD".
 */
export function computeGlobalTaskStreak(
  completedDatesSet: Set<string>,
  todayISO: string
): Streak {
  const todayCovered = completedDatesSet.has(todayISO);
  const todayPending = !todayCovered;

  // 1. Racha actual
  let current = 0;
  let cursor = todayCovered ? todayISO : prevDayISO(todayISO);

  while (completedDatesSet.has(cursor)) {
    current += 1;
    cursor = prevDayISO(cursor);
  }

  // 2. Mejor racha histórica (Best Streak)
  const sortedDates = Array.from(completedDatesSet).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const date of sortedDates) {
    if (!prev) {
      run = 1;
    } else {
      const expectedNext: Date = new Date(prev + "T12:00:00");
      expectedNext.setDate(expectedNext.getDate() + 1);
      const expectedISO: string = expectedNext.toISOString().slice(0, 10);

      if (date === expectedISO) {
        run += 1;
      } else {
        run = 1;
      }
    }
    if (run > best) best = run;
    prev = date;
  }

  if (current > best) best = current;

  return { current, best, todayPending, todayCovered };
}
