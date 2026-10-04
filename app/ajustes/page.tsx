import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/server";
import { getStreak, getTasksViewData, getUserAndProfile } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { SettingsClient } from "@/components/settings-client";
import { FadeIn } from "@/components/animated";

export default async function AjustesPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const [{ lang }, streak, { lists, tasks }] = await Promise.all([getDictionary(), getStreak(), getTasksViewData()]);
  const providers = (user.app_metadata?.providers ?? []) as string[];

  return (
    <AppShell
      lang={lang}
      name={profile?.name}
      streak={streak}
      className="max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]"
    >
      <FadeIn>
        <SettingsClient
          name={profile?.name ?? null}
          email={user.email ?? null}
          hasPassword={providers.includes("email")}
          lists={lists}
          tasks={tasks}
        />
      </FadeIn>
    </AppShell>
  );
}

