"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowDown,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  Unlink,
  Workflow,
} from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { GlassModal } from "@/components/glass-modal";
import { FlowNode, GhostRun } from "@/components/flow-node";
import { TaskCard } from "@/components/task-card";
import { ChainEditModal } from "@/components/chain-edit-modal";
import { ChainAddTaskModal } from "@/components/chain-add-task-modal";
import { useLang } from "@/components/language";
import { formatHours } from "@/lib/dates";
import type { Task, TaskChain, TaskList } from "@/lib/types";
import { disconnectTasks, moveOrChainTask, unchainTask } from "@/actions/tasks";

type DropTarget = {
  targetTaskId: string;
  position: "before" | "after";
  isStandaloneArea?: boolean;
};

/**
 * Vista de flujos:
 * cabecera acordeón por cadena, pipeline horizontal con conectores
 * interactivos para desconectar (con confirmación), drag and drop para
 * reordenar o encadenar tareas, y sección de tareas independientes.
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

  // Estado global de Drag and Drop
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado para modal de confirmación de desconexión
  const [disconnectingPair, setDisconnectingPair] = useState<{
    fromTask: Task;
    toTask: Task;
  } | null>(null);

  const chainedIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of chains) {
      for (const task of c.tasks) set.add(task.id);
    }
    return set;
  }, [chains]);

  const isDraggingChainedTask = !!dragId && chainedIds.has(dragId);

  function handleDropTask(sourceId: string, targetId: string, position: "before" | "after") {
    setDragId(null);
    setDropTarget(null);
    startTransition(async () => {
      await moveOrChainTask({ sourceTaskId: sourceId, targetTaskId: targetId, position });
    });
  }

  function handleUnchainTask(taskId: string) {
    setDragId(null);
    setDropTarget(null);
    startTransition(async () => {
      await unchainTask(taskId);
    });
  }

  function handleDisconnectConfirm() {
    if (!disconnectingPair) return;
    const { fromTask } = disconnectingPair;
    startTransition(async () => {
      await disconnectTasks(fromTask.id);
      setDisconnectingPair(null);
    });
  }

  if (chains.length === 0 && standalone.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-4xl" aria-hidden>
          ○
        </p>
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
          dragId={dragId}
          dropTarget={dropTarget}
          setDragId={setDragId}
          setDropTarget={setDropTarget}
          onDropTask={handleDropTask}
          onDisconnect={(from, to) => setDisconnectingPair({ fromTask: from, toTask: to })}
        />
      ))}

      {/* Sección de tareas independientes */}
      {standalone.length > 0 && (
        <section
          className={`flex flex-col gap-3 w-full rounded-2xl p-2 transition-all ${
            isDraggingChainedTask
              ? "border-2 border-dashed border-accent/40 bg-accent/5 ring-1 ring-accent/20"
              : ""
          }`}
          onDragOver={(e) => {
            if (isDraggingChainedTask) {
              e.preventDefault();
              setDropTarget({ targetTaskId: "", position: "after", isStandaloneArea: true });
            }
          }}
          onDrop={(e) => {
            if (isDraggingChainedTask && dragId) {
              e.preventDefault();
              handleUnchainTask(dragId);
            }
          }}
          aria-label={t.views.standalone}
        >
          <div className="w-full flex items-center justify-between p-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-foreground/80">
              {t.views.standalone} ({standalone.length})
            </span>
            {isDraggingChainedTask && (
              <span className="text-xs font-semibold text-accent flex items-center gap-1.5 animate-pulse">
                <Unlink size={13} />
                {t.chains.dropToUnchain}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full [&>*]:min-w-0">
            {standalone.map((task) => {
              const isTargetBefore =
                dropTarget?.targetTaskId === task.id &&
                dropTarget.position === "before" &&
                !dropTarget.isStandaloneArea;
              const isTargetAfter =
                dropTarget?.targetTaskId === task.id &&
                dropTarget.position === "after" &&
                !dropTarget.isStandaloneArea;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/task-id", task.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(task.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(e) => {
                    if (!dragId || dragId === task.id) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const isAfter = e.clientY > rect.top + rect.height / 2;
                    setDropTarget({
                      targetTaskId: task.id,
                      position: isAfter ? "after" : "before",
                    });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragId && dragId !== task.id) {
                      const pos =
                        dropTarget?.targetTaskId === task.id ? dropTarget.position : "after";
                      handleDropTask(dragId, task.id, pos);
                    }
                  }}
                  className={`relative transition-all ${
                    dragId === task.id ? "opacity-35 scale-[0.98]" : "cursor-grab active:cursor-grabbing"
                  }`}
                >
                  {isTargetBefore && (
                    <div
                      aria-hidden
                      className="h-1.5 -mt-1 mb-2 rounded-full bg-accent shadow-[0_0_10px_rgba(var(--accent),0.7)] animate-pulse"
                    />
                  )}
                  <TaskCard
                    task={task}
                    list={task.list_id ? (listById.get(task.list_id) ?? null) : null}
                    lists={lists}
                    tasks={tasks}
                    nextTitle={task.next_task_id ? byId.get(task.next_task_id)?.title : null}
                  />
                  {isTargetAfter && (
                    <div
                      aria-hidden
                      className="h-1.5 -mb-1 mt-2 rounded-full bg-accent shadow-[0_0_10px_rgba(var(--accent),0.7)] animate-pulse"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal de confirmación para eliminar conexión */}
      {disconnectingPair && (
        <GlassModal
          isOpen={true}
          onClose={() => setDisconnectingPair(null)}
          maxWidth="sm"
          hideHeaderDivider
        >
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15 text-danger border border-danger/25 shadow-xs">
              <Unlink size={30} />
            </span>

            <div className="flex flex-col gap-1.5 max-w-xs">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {t.chains.disconnectTitle}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {t.chains.disconnectMsg}
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 w-full rounded-xl bg-surface/60 border border-border/50 text-xs text-foreground/90 font-medium justify-center">
              <span className="truncate max-w-[120px] font-semibold">
                {disconnectingPair.fromTask.title}
              </span>
              <ArrowRight size={14} className="text-danger shrink-0" />
              <span className="truncate max-w-[120px] font-semibold">
                {disconnectingPair.toTask.title}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <Button
                fullWidth
                variant="secondary"
                className="rounded-xl h-10 font-medium glass-btn"
                onPress={() => setDisconnectingPair(null)}
                isDisabled={isPending}
              >
                {t.chains.cancel}
              </Button>
              <Button
                fullWidth
                variant="danger"
                className="rounded-xl h-10 font-semibold shadow-xs"
                onPress={handleDisconnectConfirm}
                isDisabled={isPending}
              >
                {isPending ? <Spinner size="sm" color="current" /> : t.chains.disconnectConfirm}
              </Button>
            </div>
          </div>
        </GlassModal>
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
  dragId: externalDragId,
  dropTarget: externalDropTarget,
  setDragId: externalSetDragId,
  setDropTarget: externalSetDropTarget,
  onDropTask: externalOnDropTask,
  onDisconnect: externalOnDisconnect,
}: {
  chain: TaskChain;
  lists: TaskList[];
  tasks: Task[];
  isInScope?: (t: Task) => boolean;
  showCompleted?: boolean;
  dragId?: string | null;
  dropTarget?: DropTarget | null;
  setDragId?: (id: string | null) => void;
  setDropTarget?: (target: DropTarget | null) => void;
  onDropTask?: (sourceId: string, targetId: string, position: "before" | "after") => void;
  onDisconnect?: (from: Task, to: Task) => void;
}) {
  const { lang, t } = useLang();
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addingPosition, setAddingPosition] = useState<"start" | "end" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Fallback interno si ChainSection se utiliza fuera de TaskChainTrack (ej. en modal)
  const [internalDragId, setInternalDragId] = useState<string | null>(null);
  const [internalDropTarget, setInternalDropTarget] = useState<DropTarget | null>(null);
  const [internalDisconnectPair, setInternalDisconnectPair] = useState<{
    fromTask: Task;
    toTask: Task;
  } | null>(null);
  const [isInternalPending, startInternalTransition] = useTransition();

  const dragId = externalDragId !== undefined ? externalDragId : internalDragId;
  const dropTarget = externalDropTarget !== undefined ? externalDropTarget : internalDropTarget;
  const setDragId = externalSetDragId || setInternalDragId;
  const setDropTarget = externalSetDropTarget || setInternalDropTarget;

  const onDropTask =
    externalOnDropTask ||
    ((sourceId, targetId, pos) => {
      setDragId(null);
      setDropTarget(null);
      startInternalTransition(async () => {
        await moveOrChainTask({ sourceTaskId: sourceId, targetTaskId: targetId, position: pos });
      });
    });

  const onDisconnect =
    externalOnDisconnect ||
    ((from, to) => {
      setInternalDisconnectPair({ fromTask: from, toTask: to });
    });

  const doneCount = chain.tasks.filter((t) => t.status === "completed").length;
  const fullyDone = doneCount === chain.tasks.length;
  const totalHours = chain.tasks.reduce((acc, t) => acc + (t.estimated_hours ?? 0), 0);
  const hasEstimate = chain.tasks.some((t) => t.estimated_hours != null);
  const head = chain.tasks[0];
  const tail = chain.tasks[chain.tasks.length - 1];
  const targetId = chain.tasks.find((t) => t.status !== "completed")?.id;
  const rendered = chain.tasks;

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
      {/* Cabecera de cadena */}
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

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={`${t.chains.addToStart}: ${chain.name}`}
            title={`${t.chains.addToStart}: ${chain.name}`}
            className="h-7 px-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface/80 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            onClick={() => setAddingPosition("start")}
          >
            <Plus size={13} className="text-accent shrink-0" />
            <ArrowLeftToLine size={13} className="shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold">{t.chains.start}</span>
          </button>

          <button
            type="button"
            aria-label={`${t.chains.addToEnd}: ${chain.name}`}
            title={`${t.chains.addToEnd}: ${chain.name}`}
            className="h-7 px-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface/80 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            onClick={() => setAddingPosition("end")}
          >
            <Plus size={13} className="text-accent shrink-0" />
            <ArrowRightToLine size={13} className="shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold">{t.chains.end}</span>
          </button>

          <button
            type="button"
            aria-label={`${t.chains.editAria}: ${chain.name}`}
            title={`${t.chains.editAria}: ${chain.name}`}
            className="flex items-center justify-center h-7 w-7 text-muted hover:text-foreground hover:bg-surface/80 rounded-lg cursor-pointer transition-colors"
            onClick={() => setEditing(true)}
          >
            <Pencil size={13} />
          </button>
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

      {addingPosition && (
        <ChainAddTaskModal
          isOpen={true}
          onClose={() => setAddingPosition(null)}
          chain={chain}
          position={addingPosition}
          lists={lists}
          tasks={tasks}
        />
      )}

      <AnimatePresence initial={false}>
        {!collapsed && (
          <m.div
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
                const nextTask = nextIsNode
                  ? (segments[si + 1] as { kind: "node"; task: Task }).task
                  : undefined;

                const showBeforeIndicator =
                  dropTarget?.targetTaskId === t.id && dropTarget.position === "before";
                const showAfterIndicator =
                  dropTarget?.targetTaskId === t.id && dropTarget.position === "after";

                return (
                  <div
                    key={t.id}
                    ref={isTarget ? targetRef : undefined}
                    className="flex flex-col md:flex-row items-center w-full md:w-auto shrink-0"
                  >
                    {showBeforeIndicator && <DropIndicator />}

                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/task-id", t.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropTarget(null);
                      }}
                      onDragOver={(e) => {
                        if (!dragId || dragId === t.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const isHorizontal = rect.width >= rect.height;
                        const isAfter = isHorizontal
                          ? e.clientX > rect.left + rect.width / 2
                          : e.clientY > rect.top + rect.height / 2;
                        setDropTarget({
                          targetTaskId: t.id,
                          position: isAfter ? "after" : "before",
                        });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragId && dragId !== t.id) {
                          const pos =
                            dropTarget?.targetTaskId === t.id ? dropTarget.position : "after";
                          onDropTask(dragId, t.id, pos);
                        }
                      }}
                      className={`w-full max-w-sm md:w-64 lg:w-72 shrink-0 transition-all ${
                        dragId === t.id
                          ? "opacity-35 scale-[0.98]"
                          : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <FlowNode
                        task={t}
                        list={list}
                        lists={lists}
                        tasks={tasks}
                        isCurrentTarget={isTarget}
                      />
                    </div>

                    {showAfterIndicator && <DropIndicator />}

                    {!isLastSeg && nextIsNode && nextTask && (
                      <ChainConnector
                        fromTask={t}
                        toTask={nextTask}
                        done={t.status === "completed"}
                        onDisconnect={onDisconnect}
                      />
                    )}
                  </div>
                );
              })}

              {/* Slot para soltar al final del flujo (visible durante arrastre) */}
              {dragId && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (tail && dragId !== tail.id) {
                      setDropTarget({ targetTaskId: tail.id, position: "after" });
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (tail && dragId !== tail.id) {
                      onDropTask(dragId, tail.id, "after");
                    }
                  }}
                  className={`w-full md:w-44 shrink-0 rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    dropTarget?.targetTaskId === tail?.id && dropTarget?.position === "after"
                      ? "border-accent bg-accent/20 scale-102 ring-2 ring-accent/30 text-accent"
                      : "border-border/60 hover:border-accent/60 bg-surface/30 text-muted hover:text-foreground"
                  }`}
                >
                  <Plus size={16} className="mb-1 text-accent" />
                  <span className="text-xs font-semibold text-center">{t.chains.dropToEnd}</span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Modal fallback interno para desconexión si se usa standalone */}
      {internalDisconnectPair && (
        <GlassModal
          isOpen={true}
          onClose={() => setInternalDisconnectPair(null)}
          maxWidth="sm"
          hideHeaderDivider
        >
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15 text-danger border border-danger/25 shadow-xs">
              <Unlink size={30} />
            </span>

            <div className="flex flex-col gap-1.5 max-w-xs">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {t.chains.disconnectTitle}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {t.chains.disconnectMsg}
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 w-full rounded-xl bg-surface/60 border border-border/50 text-xs text-foreground/90 font-medium justify-center">
              <span className="truncate max-w-[120px] font-semibold">
                {internalDisconnectPair.fromTask.title}
              </span>
              <ArrowRight size={14} className="text-danger shrink-0" />
              <span className="truncate max-w-[120px] font-semibold">
                {internalDisconnectPair.toTask.title}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <Button
                fullWidth
                variant="secondary"
                className="rounded-xl h-10 font-medium glass-btn"
                onPress={() => setInternalDisconnectPair(null)}
                isDisabled={isInternalPending}
              >
                {t.chains.cancel}
              </Button>
              <Button
                fullWidth
                variant="danger"
                className="rounded-xl h-10 font-semibold shadow-xs"
                onPress={() => {
                  startInternalTransition(async () => {
                    await disconnectTasks(internalDisconnectPair.fromTask.id);
                    setInternalDisconnectPair(null);
                  });
                }}
                isDisabled={isInternalPending}
              >
                {isInternalPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  t.chains.disconnectConfirm
                )}
              </Button>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
}

/**
 * Conector interactivo entre dos tareas de un flujo:
 * al hacer clic abre la confirmación de desconexión.
 */
function ChainConnector({
  fromTask,
  toTask,
  done,
  onDisconnect,
}: {
  fromTask: Task;
  toTask: Task;
  done: boolean;
  onDisconnect: (from: Task, to: Task) => void;
}) {
  const { t } = useLang();

  return (
    <button
      type="button"
      onClick={() => onDisconnect(fromTask, toTask)}
      title={`${t.chains.disconnect}: ${fromTask.title} → ${toTask.title}`}
      aria-label={`${t.chains.disconnect}: ${fromTask.title} → ${toTask.title}`}
      className="relative group/conn flex items-center justify-center shrink-0 cursor-pointer p-1.5 rounded-xl hover:bg-danger/10 transition-all duration-200"
    >
      {/* Desktop connector (horizontal) */}
      <div className="hidden md:flex items-center shrink-0 select-none">
        <div
          className={`h-[2px] w-6 md:w-8 transition-colors duration-200 ${
            done
              ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.7)] group-hover/conn:bg-danger group-hover/conn:shadow-none"
              : "bg-zinc-400 dark:bg-zinc-500 group-hover/conn:bg-danger"
          }`}
        />
        <ArrowRight
          size={18}
          strokeWidth={2.5}
          className={`-ml-1 transition-all duration-200 ${
            done
              ? "text-success drop-shadow-[0_0_6px_rgba(22,163,74,0.5)] group-hover/conn:text-danger group-hover/conn:drop-shadow-none"
              : "text-zinc-400 dark:text-zinc-500 group-hover/conn:text-danger"
          }`}
        />
      </div>

      {/* Mobile connector (vertical) */}
      <div className="flex md:hidden flex-col items-center shrink-0 select-none">
        <div
          className={`w-[2px] h-5 transition-colors duration-200 ${
            done
              ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.7)] group-hover/conn:bg-danger group-hover/conn:shadow-none"
              : "bg-zinc-400 dark:bg-zinc-500 group-hover/conn:bg-danger"
          }`}
        />
        <ArrowDown
          size={18}
          strokeWidth={2.5}
          className={`-mt-1 transition-all duration-200 ${
            done
              ? "text-success drop-shadow-[0_0_6px_rgba(22,163,74,0.5)] group-hover/conn:text-danger group-hover/conn:drop-shadow-none"
              : "text-zinc-400 dark:text-zinc-500 group-hover/conn:text-danger"
          }`}
        />
      </div>

      {/* Indicador flotante en hover */}
      <span className="opacity-0 group-hover/conn:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-danger text-[10px] text-white font-medium shadow-md transition-opacity duration-150 pointer-events-none whitespace-nowrap z-20 flex items-center gap-1">
        <Unlink size={11} />
        <span>{t.chains.disconnect}</span>
      </span>
    </button>
  );
}

/** Barra brillante que marca el punto exacto de inserción durante drag & drop */
function DropIndicator() {
  return (
    <>
      <div
        aria-hidden
        className="hidden md:flex h-24 w-1.5 mx-1 shrink-0 bg-accent rounded-full animate-pulse shadow-[0_0_12px_rgba(var(--accent),0.8)] z-10"
      />
      <div
        aria-hidden
        className="flex md:hidden w-full h-1.5 my-1 shrink-0 bg-accent rounded-full animate-pulse shadow-[0_0_12px_rgba(var(--accent),0.8)] z-10"
      />
    </>
  );
}
