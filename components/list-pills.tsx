"use client";

import { ListIcon } from "@/components/list-icon";
import { useLang } from "@/components/language";
import type { Task, TaskList } from "@/lib/types";

/** Pills de filtro por lista (Todas + cada lista con contador de pendientes). */
export function ListPills({
  lists,
  tasks,
  value,
  onChange,
}: {
  lists: TaskList[];
  tasks: Task[];
  value: string | "all";
  onChange: (v: string | "all") => void;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.task.list}>
      <button
        type="button"
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
        className={`glass-pill px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
          value === "all" ? "glass-pill-active" : "text-muted hover:text-foreground"
        }`}
      >
        {t.all.allTab} ({tasks.filter((t) => t.status !== "completed").length})
      </button>
      {(() => {
        const ids = new Set(lists.map((l) => l.id));
        const n = tasks.filter((t) => (!t.list_id || !ids.has(t.list_id)) && t.status !== "completed").length;
        const sel = value === "none";
        return (
          <button
            type="button"
            aria-pressed={sel}
            onClick={() => onChange("none")}
            className={`glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
              sel ? "glass-pill-active" : "text-muted hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full border border-dashed border-current" />
            {t.task.noList} ({n})
          </button>
        );
      })()}
      {lists.map((l) => {
        const n = tasks.filter((t) => t.list_id === l.id && t.status !== "completed").length;
        const sel = value === l.id;
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={sel}
            onClick={() => onChange(l.id)}
            className={`glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
              sel ? "glass-pill-active" : "text-muted hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
            <ListIcon icon={l.icon} size={13} />
            {l.name} ({n})
          </button>
        );
      })}
    </div>
  );
}
