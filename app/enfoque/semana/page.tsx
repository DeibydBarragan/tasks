import { redirect } from "next/navigation";
import { getStreak, getTasksViewData, getUserAndProfile } from "@/lib/queries";
import { getFocusRange } from "@/actions/focus";
import { AppShell } from "@/components/app-shell";
import { FocusWeek } from "@/components/focus-week";
import { getDictionary } from "@/lib/i18n/server";

function mondayISO(d = new Date()): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function SemanaPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const [{ lang }, streak, { lists, tasks }] = await Promise.all([
    getDictionary(),
    getStreak(),
    getTasksViewData(),
  ]);
  const mon = mondayISO();
  const monDate = new Date(mon + "T12:00:00");
  const nextMon = new Date(monDate);
  nextMon.setDate(nextMon.getDate() + 7);
  const sessions = (await getFocusRange(
    monDate.toISOString(),
    nextMon.toISOString()
  )) as {
    id: string;
    task_id: string | null;
    list_id: string | null;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    note: string | null;
    tasks: { title: string } | null;
    task_lists: { name: string; color: string } | null;
  }[];

  return (
    <AppShell
      lang={lang}
      name={profile?.name}
      streak={streak}
      className="max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]"
    >
      <FocusWeek lists={lists} tasks={tasks} initialSessions={sessions} initialMonday={mon} />
    </AppShell>
  );
}
