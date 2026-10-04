import type { Lang } from "@/lib/i18n/dictionaries";
import { dictionaries } from "@/lib/i18n/dictionaries";

/** Fecha local en formato "YYYY-MM-DD" (igual que habits). */
export function toLocalISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Suma (o resta) días a un ISO "YYYY-MM-DD". */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

/** true si la fecha límite ya pasó respecto a hoy (pendientes atrasadas). */
export function isOverdueISO(due: string | null, todayISO: string): boolean {
  return !!due && due < todayISO;
}

/** Etiqueta corta localizada: Hoy/Today, Mañana/Tomorrow, Ayer/Yesterday o "lun, 5 oct". */
export function shortDateLabel(iso: string, todayISO: string, lang: Lang = "es"): string {
  const t = dictionaries[lang].dates;
  if (iso === todayISO) return t.today;
  if (iso === addDaysISO(todayISO, 1)) return t.tomorrow;
  if (iso === addDaysISO(todayISO, -1)) return t.yesterday;
  const d = new Date(iso + "T12:00:00");
  const s = new Intl.DateTimeFormat(lang, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  const thisYear = iso.slice(0, 4) === todayISO.slice(0, 4);
  return thisYear ? s : `${s} ${iso.slice(0, 4)}`;
}

/** Fecha larga localizada: "sábado, 3 de octubre" / "Saturday, October 3". */
export function longDateLabel(iso: string, lang: Lang = "es"): string {
  return new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso + "T12:00:00"));
}

/** Mes y año localizados: "octubre de 2026" / "October 2026". */
export function monthYearLabel(year: number, month: number, lang: Lang = "es"): string {
  return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
}


/** Horas estimadas localizadas: 2 h / 2,5 h. */
export function formatHours(hours: number, lang: Lang = "es"): string {
  const n = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(hours);
  return `${n} h`;
}