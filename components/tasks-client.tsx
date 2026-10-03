"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import { ListIcon } from "@/components/list-icon";
import { ListFormModal } from "@/components/list-form-modal";
import { DeleteModal } from "@/components/delete-modal";
import { TaskFormModal } from "@/components/task-form-modal";
import { TaskCard } from "@/components/task-card";
import { TaskToolbar } from "@/components/task-toolbar";
import { TaskChainsSection } from "@/components/task-chains";
import { FadeIn, Stagger, StaggerItem } from "@/components/animated";
import type { SortOption, Task, TaskList } from "@/lib/types";
import { applyTaskFilters } from "@/lib/task-filters";
import { deleteList } from "@/actions/lists";
import { clearCompleted } from "@/actions/tasks";

export function TasksClient({ lists, tasks }: { lists: TaskList[]; tasks: Task[] }) {
  const [activeListId, setActiveListId] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<SortOption>("due_date");
  const [clearOpen, setClearOpen] = useState(false);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const visible = useMemo(() => {
    const inList =
      activeListId === "all" ? tasks : tasks.filter((t) => t.list_id === activeListId);
    return applyTaskFilters(inList, { query, showCompleted, sort });
  }, [tasks, activeListId, query, showCompleted, sort]);

  const activeList = activeListId === "all" ? null : (listById.get(activeListId) ?? null);
  const pendingCount = visible.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Todas las tareas
            </h1>
            <p className="mt-1 text-sm text-muted">
              {pendingCount === 0 && !query
                ? "Nada pendiente. Buen momento para crear algo nuevo."
                : `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}${
                    completedCount > 0 ? ` · ${completedCount} completada${completedCount === 1 ? "" : "s"}` : ""
                  }`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ListFormModal />
            <TaskFormModal lists={lists} tasks={tasks} defaultListId={activeList?.id} />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <TaskToolbar
          query={query}
          onQuery={setQuery}
          showCompleted={showCompleted}
          onShowCompleted={setShowCompleted}
          sort={sort}
          onSort={setSort}
        />
      </FadeIn>

      <TaskChainsSection lists={lists} tasks={tasks} />

      <FadeIn delay={0.05}>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por lista">
          <button
            type="button"
            aria-pressed={activeListId === "all"}
            onClick={() => setActiveListId("all")}
            className={`glass-pill px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
              activeListId === "all" ? "glass-pill-active" : "text-muted hover:text-foreground"
            }`}
          >
            Todas ({tasks.filter((t) => t.status !== "completed").length})
          </button>
          {lists.map((l) => {
            const n = tasks.filter((t) => t.list_id === l.id && t.status !== "completed").length;
            const sel = activeListId === l.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={sel}
                onClick={() => setActiveListId(l.id)}
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
      </FadeIn>

      {activeList && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeList.color }} />
            <ListIcon icon={activeList.icon} size={16} />
            {activeList.name}
          </span>
          <span className="flex items-center gap-1">
            <ListFormModal list={activeList} triggerLabel="Editar" />
            <DeleteModal
              title="Eliminar lista"
              message={`«${activeList.name}» se eliminará. Sus tareas quedarán sin lista.`}
              ariaLabel={`Eliminar lista ${activeList.name}`}
              onConfirm={async () => {
                await deleteList(activeList.id);
                setActiveListId("all");
              }}
            />
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl" aria-hidden>{query ? "∅" : "○"}</p>
          <p className="mt-2 font-medium">
            {query ? "Sin resultados para tu búsqueda" : "Sin tareas aquí"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {query
              ? "Prueba con otras palabras o cambia de lista."
              : "Crea tu primera tarea con el botón «Nueva tarea»."}
          </p>
        </div>
      ) : (
        <Stagger className="flex flex-col gap-2.5">
          {visible.map((t) => (
            <StaggerItem key={t.id}>
              <TaskCard
                task={t}
                list={t.list_id ? (listById.get(t.list_id) ?? null) : null}
                lists={lists}
                tasks={tasks}
                nextTitle={t.next_task_id ? byId.get(t.next_task_id)?.title : null}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Historial de completadas: limpiar */}
      {completedCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-2.5">
          <p className="text-xs text-muted">
            {completedCount} tarea{completedCount === 1 ? " completada (historial)" : "s completadas (historial)"}.
            Desmárcalas desde su tarjeta para recuperarlas.
          </p>
          {clearOpen ? (
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium">¿Eliminarlas para siempre?</span>
              <Button
                size="sm"
                variant="danger"
                className="rounded-xl font-semibold"
                onPress={async () => {
                  await clearCompleted();
                  setClearOpen(false);
                }}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onPress={() => setClearOpen(false)}
              >
                No
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-muted hover:text-danger"
              onPress={() => setClearOpen(true)}
            >
              <Trash2 size={14} className="mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
