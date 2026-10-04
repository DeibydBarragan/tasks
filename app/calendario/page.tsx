import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/server";
import { getStreak, getTasksViewData, getUserAndProfile } from "@/lib/queries";
import { toLocalISODate } from "@/lib/dates";
import { AppShell } from "@/components/app-shell";
import { CalendarView } from "@/components/calendar-view";

export default async function CalendarioPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const [{ lang }, streak, { lists, tasks }] = await Promise.all([getDictionary(), getStreak(), getTasksViewData()]);
  const today = toLocalISODate();

  return (
    <AppShell
      lang={lang}
      name={profile?.name}
      streak={streak}
      className="max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]"
    >
      <CalendarView lists={lists} tasks={tasks} today={today} />
    </AppShell>
  );
}

