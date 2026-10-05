import { redirect } from "next/navigation";
import { getStreak, getTasksViewData, getUserAndProfile } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { FocusReports } from "@/components/focus-reports";
import { getDictionary } from "@/lib/i18n/server";

export default async function InformesEnfoquePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const [{ lang }, streak, { lists, tasks }] = await Promise.all([
    getDictionary(),
    getStreak(),
    getTasksViewData(),
  ]);

  return (
    <AppShell
      lang={lang}
      name={profile?.name}
      streak={streak}
      className="max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]"
    >
      <FocusReports lists={lists} tasks={tasks} />
    </AppShell>
  );
}
