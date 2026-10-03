import { redirect } from "next/navigation";
import { getStreak, getTasksViewData, getUserAndProfile } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TasksClient } from "@/components/tasks-client";

export default async function TareasPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const [streak, { lists, tasks }] = await Promise.all([getStreak(), getTasksViewData()]);

  return (
    <AppShell
      name={profile?.name}
      streak={streak}
      className="max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]"
    >
      <TasksClient lists={lists} tasks={tasks} />
    </AppShell>
  );
}
