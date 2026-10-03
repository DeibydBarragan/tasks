import { redirect } from "next/navigation";
import { getStreak, getTasksViewData, getUserAndProfile } from "@/lib/queries";
import { toLocalISODate } from "@/lib/dates";
import { AppShell } from "@/components/app-shell";
import { UpcomingClient } from "@/components/upcoming-client";

export default async function ProximosPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const [streak, { lists, tasks }] = await Promise.all([getStreak(), getTasksViewData()]);
  const today = toLocalISODate();

  return (
    <AppShell
      name={profile?.name}
      streak={streak}
      className="max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]"
    >
      <UpcomingClient lists={lists} tasks={tasks} today={today} />
    </AppShell>
  );
}
