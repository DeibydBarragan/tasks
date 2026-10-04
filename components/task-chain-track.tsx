"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@heroui/react";
import { ArrowDown, ArrowRight, ChevronDown, Clock, Pencil, Sparkles, Timer, Workflow } from "lucide-react";
import { FlowNode, GhostRun } from "@/components/flow-node";
import { TaskCard } from "@/components/task-card";
import { ChainEditModal } from "@/components/chain-edit-modal";
import { useLang } from "@/components/language";
import { formatHours } from "@/lib/dates";
import type { Task, TaskChain, TaskList } from "@/lib/types";

/**
 * Vista de flujos réplica de habits/hoy (TodayChainView + ChainTrack):
 * cabecera acordeón por cadena, pipeline horizontal con conectores
 * coloreados por estado y sección de tareas individuales.
 */
export function TaskChainTrack({
  chains,
  standalone,
  lists,
  tasks,
  isInScope,
  showCompleted = true,
}: {
  chains: TaskChain[];
  standalone: Task[];
  lists: TaskList[];
  tasks: Task[];
  isInScope?: (t: Task) => boolean;
  showCompleted?: boolean;
}) {
  const { t } = useLang();
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  if (chains.length === 0 && standalone.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-4xl" aria-hidden>○</p>
        <p className="mt-2 font-medium">{t.all.noTasks}</p>
        <p className="mt-1 text-sm text-muted">{t.all.newHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full py-2">
      {chains.map((chain) => (
        <ChainSection
          key={chain.id}
          chain={chain}
          lists={lists}
          tasks={tasks}
          isInScope={isInScope}
          showCompleted={showCompleted}
        />
      ))}

      {standalone.length > 0 && (
        <section className="flex flex-col gap-3 w-full" aria-label={t.views.standalone}>
          <div className="w-full flex items-center gap-2.5 p-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-foreground/80">
              {t.views.standalone} ({standalone.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {standalone.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                list={task.list_id ? (listById.get(task.list_id) ?? null) : null}
                lists={lists}
                tasks={tasks}
                nextTitle={task.next_task_id ? byId.get(task.next_task_id)?.title : null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ChainSection({
  chain,
  lists,
  tasks,
  isInScope,
  showCompleted = true,
}: {
  chain: TaskChain;
  lists: TaskList[];
  tasks: Task[];
  isInScope?: (t: Task) => boolean;
  showCompleted?: boolean;
}) {
  const { lang, t } = useLang();
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const doneCount = chain.tasks.filter((t) => t.status === "completed").length;
  const fullyDone = doneCount === chain.tasks.length;
  const totalHours = chain.tasks.reduce((acc, t) => acc + (t.estimated_hours ?? 0), 0);
  const hasEstimate = chain.tasks.some((t) => t.estimated_hours != null);
  const head = chain.tasks[0];
  const targetId = chain.tasks.find((t) => t.status !== "completed")?.id;
  // Nodos a pintar: con el switch apagado, las completadas se ven como
  // fantasma-check (la cadena no se rompe) en vez de desaparecer.
  const rendered = chain.tasks;

  // Segmentos: nodos completos y rachas de fantasmas consecutivos
  // (una sola flecha con sus iconos encima).
  const segments = useMemo(() => {
    type Seg =
      | { kind: "node"; task: Task }
      | { kind: "ghosts"; items: { task: Task; list: TaskList | null | undefined; hiddenDone: boolean }[] };
    const out: Seg[] = [];
    for (const t of rendered) {
      const list = t.list_id ? lists.find((l) => l.id === t.list_id) : undefined;
      const hiddenDone = !showCompleted && t.status === "completed";
      const full = (!isInScope || isInScope(t)) && !hiddenDone;
      if (full) {
        out.push({ kind: "node", task: t });
      } else {
        const last = out[out.length - 1];
        if (last && last.kind === "ghosts") last.items.push({ task: t, list, hiddenDone });
        else out.push({ kind: "ghosts", items: [{ task: t, list, hiddenDone }] });
      }
    }
    return out;
  }, [rendered, lists, isInScope, showCompleted]);

  useEffect(() => {
    if (!collapsed && targetRef.current && scrollRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [targetId, collapsed]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Cabecera */}
      <div className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface/60 transition-colors group select-none">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCollapsed((v) => !v);
            }
          }}
          className="flex items-center gap-2.5 flex-wrap flex-1 cursor-pointer"
          aria-expanded={!collapsed}
        >
          <ChevronDown
            size={16}
            className={`text-muted transition-transform duration-200 shrink-0 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
          <Workflow size={14} className="text-accent shrink-0" />
          <span className="text-xs font-semibold tracking-wider uppercase text-foreground/80 group-hover:text-foreground">
            {chain.name}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-surface border border-border/50 text-foreground tabular-nums">
            {doneCount}/{chain.tasks.length}
          </span>
          {chain.time && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent">
              <Clock size={11} />
              <span>{chain.time}</span>
            </span>
          )}
          {hasEstimate && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface border border-border/50 text-muted tabular-nums"
              title={t.chains.totalTime}
            >
              <Timer size={11} />
              <span>{formatHours(totalHours, lang)}</span>
            </span>
          )}
          {fullyDone && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/30">
              <Sparkles size={11} />
              <span>{t.views.completedFlow}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`${t.chains.editAria}: ${chain.name}`}
            className="h-7 w-7 text-muted hover:text-foreground hover:bg-surface/80 rounded-lg"
            onPress={() => setEditing(true)}
          >
            <Pencil size={13} />
          </Button>
        </div>
      </div>

      {head && (
        <ChainEditModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          headTaskId={chain.headId}
          initialName={head.chain_name ?? ""}
          initialTime={head.chain_time ?? ""}
        />
      )}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="pipeline-track"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="flex flex-col md:flex-row items-center md:items-stretch gap-3 md:gap-0 overflow-x-auto scroll-smooth py-3 px-1 custom-scrollbar"
            >
              {segments.map((seg, si) => {
                const isLastSeg = si === segments.length - 1;
                if (seg.kind === "ghosts") {
                  return (
                    <div
                      key={`g-${si}`}
                      className="flex flex-col md:flex-row items-center w-full md:w-auto shrink-0"
                    >
                      <GhostRun
                        items={seg.items}
                        lists={lists}
                        tasks={tasks}
                        hasNext={!isLastSeg}
                        hasPrev={si > 0}
                      />
                    </div>
                  );
                }
                const t = seg.task;
                const isTarget = t.id === targetId;
                const list = t.list_id ? lists.find((l) => l.id === t.list_id) : undefined;
                const nextIsNode = !isLastSeg && segments[si + 1].kind === "node";
                return (
                  <div
                    key={t.id}
                    ref={isTarget ? targetRef : undefined}
                    className="flex flex-col md:flex-row items-center w-full md:w-auto shrink-0"
                  >
                    <div className="w-full max-w-sm md:w-64 lg:w-72 shrink-0">
                      <FlowNode
                        task={t}
                        list={list}
                        lists={lists}
                        tasks={tasks}
                        isCurrentTarget={isTarget}
                      />
                    </div>
                    {!isLastSeg && nextIsNode && <ChainConnector done={t.status === "completed"} />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChainConnector({ done }: { done: boolean }) {
  return (
    <>
      <div className="hidden md:flex items-center shrink-0 select-none pointer-events-none">
        <div
          className={`h-[2px] w-6 md:w-8 transition-colors duration-300 ${
            done ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.7)]" : "bg-zinc-400 dark:bg-zinc-500"
          }`}
        />
        <ArrowRight
          size={18}
          strokeWidth={2.5}
          className={`-ml-1 transition-colors duration-300 ${
            done ? "text-success drop-shadow-[0_0_6px_rgba(22,163,74,0.5)]" : "text-zinc-400 dark:text-zinc-500"
          }`}
        />
      </div>
      <div className="flex md:hidden flex-col items-center shrink-0 select-none pointer-events-none">
        <div
          className={`w-[2px] h-5 transition-colors duration-300 ${
            done ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.7)]" : "bg-zinc-400 dark:bg-zinc-500"
          }`}
        />
        <ArrowDown
          size={18}
          strokeWidth={2.5}
          className={`-mt-1 transition-colors duration-300 ${
            done ? "text-success drop-shadow-[0_0_6px_rgba(22,163,74,0.5)]" : "text-zinc-400 dark:text-zinc-500"
          }`}
        />
      </div>
    </>
  );
}
