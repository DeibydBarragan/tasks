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

/** Etiqueta corta en español: "Hoy", "Mañana", "Ayer" o "lun, 5 oct". */
export function shortDateLabel(iso: string, todayISO: string): string {
  if (iso === todayISO) return "Hoy";
  if (iso === addDaysISO(todayISO, 1)) return "Mañana";
  if (iso === addDaysISO(todayISO, -1)) return "Ayer";
  const d = new Date(iso + "T12:00:00");
  const s = new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  const thisYear = iso.slice(0, 4) === todayISO.slice(0, 4);
  return thisYear ? s : `${s} ${iso.slice(0, 4)}`;
}
