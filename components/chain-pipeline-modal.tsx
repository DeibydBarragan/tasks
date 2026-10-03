"use client";

import { Button } from "@heroui/react";
import { ArrowRight, Check, Clock, Workflow } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { ListIcon } from "@/components/list-icon";
import { priorityMeta } from "@/components/task-form-modal";
import type { TaskChain, TaskList } from "@/lib/types";
import { shortDateLabel, toLocalISODate } from "@/lib/dates";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  chain: TaskChain;
  lists: TaskList[];
};

export function ChainPipelineModal({ isOpen, onClose, chain, lists }: Props) {
  const today = toLocalISODate();

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={chain.name}
      subtitle={`Vista de flujo · ${chain.tasks.length} pasos`}
      icon={<Workflow size={18} className="text-accent" />}
      footer={
        <div className="flex justify-end w-full">
          <Button
            variant="primary"
            size="sm"
            className="px-5 font-semibold text-xs rounded-xl shadow-xs"
            onPress={onClose}
          >
            Entendido
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {chain.time && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-accent/15 text-accent border border-accent/25">
              <Clock size={12} />
              <span>{chain.time}</span>
            </span>
          </div>
        )}

        {/* Pipeline (scroll horizontal suave) */}
        <div className="w-full overflow-x-auto overflow-y-auto py-2 px-1 custom-scrollbar">
          <div className="flex flex-col md:flex-row items-center md:items-stretch gap-3 md:gap-0 min-w-max">
            {chain.tasks.map((t, index) => {
              const isLast = index === chain.tasks.length - 1;
              const list = t.list_id ? lists.find((l) => l.id === t.list_id) : undefined;
              const meta = priorityMeta(t.priority);
              const done = t.status === "completed";

              return (
                <div key={t.id} className="flex flex-col md:flex-row items-center">
                  {/* Nodo */}
                  <div
                    className="w-64 lg:w-72 rounded-2xl glass-input p-4 flex flex-col gap-3 shadow-md select-none transition-all hover:border-accent/40"
                    style={{
                      borderLeftColor: list?.color ?? meta.color,
                      borderLeftWidth: "4px",
                      opacity: done ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                        style={{
                          backgroundColor: (list?.color ?? meta.color) + "30",
                          color: list?.color ?? meta.color,
                        }}
                      >
                        <ListIcon icon={list?.icon ?? "folder"} size={18} />
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (list?.color ?? meta.color) + "15",
                          color: list?.color ?? meta.color,
                        }}
                      >
                        Paso {index + 1}
                      </span>
                    </div>

                    <div>
                      <p className={`text-sm font-bold text-foreground ${done ? "line-through" : ""}`}>
                        {t.title}
                      </p>
                      {list && <p className="text-xs text-muted truncate mt-0.5">{list.name}</p>}
                    </div>

                    <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted">
                      <span className="font-semibold" style={{ color: meta.color }}>
                        P{t.priority}
                      </span>
                      {t.due_date ? (
                        <span>
                          {shortDateLabel(t.due_date, today)}
                          {t.due_time ? ` · ${t.due_time}` : ""}
                        </span>
                      ) : (
                        <span>Sin fecha</span>
                      )}
                      {done && <Check size={14} className="text-accent" />}
                    </div>
                  </div>

                  {/* Flecha conectora */}
                  {!isLast && (
                    <div className="flex md:flex-col items-center justify-center py-2 md:py-0 md:px-3 text-muted/60 shrink-0">
                      <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-surface/90 dark:bg-zinc-800/90 backdrop-blur-sm border border-border/50 text-accent shadow-xs">
                        <ArrowRight size={14} />
                      </div>
                      <div className="flex md:hidden items-center justify-center w-7 h-7 rounded-full bg-surface/90 dark:bg-zinc-800/90 backdrop-blur-sm border border-border/50 text-accent rotate-90 my-1">
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassModal>
  );
}
