"use client";

import { Workflow } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { ChainSection } from "@/components/task-chain-track";
import { useLang } from "@/components/language";
import type { Task, TaskChain, TaskList } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  chain: TaskChain;
  lists: TaskList[];
  tasks: Task[];
};

/** Modal Ver flujo: renderiza el mismo track de habits/hoy para una cadena. */
export function ChainPipelineModal({ isOpen, onClose, chain, lists, tasks }: Props) {
  const { t } = useLang();

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={chain.name}
      subtitle={`${t.chains.flowView} · ${chain.tasks.length} ${t.chains.stepsN}`}
      icon={<Workflow size={18} className="text-accent" />}
    >
      <ChainSection chain={chain} lists={lists} tasks={tasks} />
    </GlassModal>
  );
}
