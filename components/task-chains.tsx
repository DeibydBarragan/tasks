"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Clock, Pencil, Workflow } from "lucide-react";
import { buildTaskChains } from "@/lib/chains";
import type { Task, TaskChain, TaskList } from "@/lib/types";
import { ChainPipelineModal } from "@/components/chain-pipeline-modal";
import { ChainEditModal } from "@/components/chain-edit-modal";
import { FadeIn } from "@/components/animated";

/** Sección de flujos encadenados (Paso 1 → Paso 2 → …). */
export function TaskChainsSection({ lists, tasks }: { lists: TaskList[]; tasks: Task[] }) {
  const chains = useMemo(() => buildTaskChains(tasks), [tasks]);
  const [viewing, setViewing] = useState<TaskChain | null>(null);
  const [editing, setEditing] = useState<TaskChain | null>(null);

  if (chains.length === 0) return null;

  return (
    <FadeIn>
      <section className="flex flex-col gap-2.5" aria-label="Flujos de tareas">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Workflow size={15} className="text-accent" />
          Flujos ({chains.length})
        </h2>
        <div className="flex flex-col gap-2">
          {chains.map((c) => {
            const doneCount = c.tasks.filter((t) => t.status === "completed").length;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25">
                  <Workflow size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {c.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {c.tasks.length} pasos · {doneCount}/{c.tasks.length} completados
                    {c.time ? ` · ${c.time}` : ""}
                  </span>
                </span>
                {c.time && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted shrink-0">
                    <Clock size={12} />
                    {c.time}
                  </span>
                )}
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Editar flujo ${c.name}`}
                    className="h-8 w-8 min-w-0 rounded-xl px-0 text-muted hover:text-foreground"
                    onPress={() => setEditing(c)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl font-semibold glass-btn"
                    onPress={() => setViewing(c)}
                  >
                    Ver flujo
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {viewing && (
        <ChainPipelineModal
          isOpen={!!viewing}
          onClose={() => setViewing(null)}
          chain={viewing}
          lists={lists}
        />
      )}
      {editing && (
        <ChainEditModal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          headTaskId={editing.headId}
          initialName={editing.tasks[0]?.chain_name ?? ""}
          initialTime={editing.tasks[0]?.chain_time ?? ""}
          onSuccess={() => setEditing(null)}
        />
      )}
    </FadeIn>
  );
}
