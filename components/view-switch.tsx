"use client";

import { Button } from "@heroui/react";
import { Columns3, LayoutList, Workflow } from "lucide-react";
import { useLang } from "@/components/language";
import type { ViewMode } from "@/components/use-view-mode";

/** Switch Lista ⇄ Flujos ⇄ Tablero estilo habits/hoy. */
export function ViewSwitch({
  mode,
  onChange,
  showChain = true,
  showKanban = true,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  showChain?: boolean;
  showKanban?: boolean;
}) {
  const { t } = useLang();
  const items: { key: ViewMode; label: string; Icon: typeof LayoutList }[] = [
    { key: "list", label: t.views.list, Icon: LayoutList },
  ];
  if (showChain) items.push({ key: "chain", label: t.views.chain, Icon: Workflow });
  if (showKanban) items.push({ key: "kanban", label: t.views.kanban, Icon: Columns3 });
  return (
    <div
      className="flex gap-1 bg-surface/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl p-1 shadow-xs"
      role="group"
      aria-label="view"
    >
      {items.map(({ key, label, Icon }) => (
        <Button
          key={key}
          isIconOnly
          size="sm"
          variant={mode === key ? "primary" : "ghost"}
          className={`h-8 w-8 rounded-xl ${mode === key ? "" : "text-muted hover:text-foreground"}`}
          aria-label={label}
          onPress={() => onChange(key)}
        >
          <Icon size={16} />
        </Button>
      ))}
    </div>
  );
}
