"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button, Tabs } from "@heroui/react";
import { LanguageToggle, useLang } from "@/components/language";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakBadge } from "@/components/streak-badge";
import type { Streak } from "@/lib/types";

export function AppNav({
  name,
  streak,
  onSignOut,
  containerClass = "max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]",
}: {
  name?: string | null;
  streak: Streak;
  onSignOut: () => void;
  containerClass?: string;
}) {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const firstName = name?.trim().split(/\s+/)[0];
  const selectedTab = pathname.startsWith("/enfoque") ? "/enfoque" : pathname;

  const LINKS = [
    { href: "/hoy", label: t.nav.today },
    { href: "/proximos", label: t.nav.upcoming },
    { href: "/tareas", label: t.nav.all },
    { href: "/eisenhower", label: t.nav.matrix },
    { href: "/calendario", label: t.nav.calendar },
    { href: "/enfoque", label: t.focus.tab },
    { href: "/ajustes", label: t.nav.settings },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 dark:border-white/10 bg-background/85 dark:bg-background/80 backdrop-blur-xl">
      <div className={`mx-auto flex items-center justify-between px-5 py-3 transition-all duration-300 ${containerClass}`}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight" translate="no">
            tasks
          </span>
          <StreakBadge streak={streak} />
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 hidden max-w-[120px] truncate text-xs text-muted sm:block">{firstName}</span>
          <LanguageToggle />
          <ThemeToggle labelLight={t.theme.toLight} labelDark={t.theme.toDark} />
          <Button variant="ghost" size="sm" onPress={() => onSignOut()}>
            {t.nav.signOut}
          </Button>
        </div>
      </div>
      <div className={`mx-auto overflow-x-auto px-5 pb-3 transition-all duration-300 ${containerClass}`}>
        <Tabs selectedKey={selectedTab} onSelectionChange={(key) => router.push(String(key))}>
          <Tabs.List aria-label={t.nav.navLabel}>
            {LINKS.map((l) => (
              <Tabs.Tab key={l.href} id={l.href}>
                {l.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      </div>
    </header>
  );
}
