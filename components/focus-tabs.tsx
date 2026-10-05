"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@heroui/react";
import { useLang } from "@/components/language";

/** Sub-pestañas de la sección Enfoque. */
export function FocusTabs() {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const LINKS = [
    { href: "/enfoque/semana", label: t.focus.week },
    { href: "/enfoque/calendario", label: t.focus.calendar },
    { href: "/enfoque/informes", label: t.focus.reports },
  ];
  return (
    <Tabs selectedKey={pathname} onSelectionChange={(key) => router.push(String(key))}>
      <Tabs.List aria-label={t.focus.tab}>
        {LINKS.map((l) => (
          <Tabs.Tab key={l.href} id={l.href}>
            {l.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
