import { Task, TaskChain } from "./types";

/**
 * Reconstruye las secuencias encadenadas de tareas (Task A -> Task B -> Task C).
 */
export function buildTaskChains(tasks: Task[]): TaskChain[] {
  const allById = new Map(tasks.map((t) => [t.id, t]));
  const targetedIds = new Set<string>();

  for (const t of tasks) {
    if (t.next_task_id && allById.has(t.next_task_id)) {
      targetedIds.add(t.next_task_id);
    }
  }

  const chains: TaskChain[] = [];
  const visited = new Set<string>();

  // Cabezas de cadena (tareas que tienen next_task_id pero ninguna otra apunta a ellas)
  const heads = tasks.filter(
    (t) => !targetedIds.has(t.id) && t.next_task_id && allById.has(t.next_task_id)
  );

  for (const head of heads) {
    if (visited.has(head.id)) continue;
    const chainTasks: Task[] = [head];
    const inChain = new Set<string>([head.id]);
    let curr = head;

    while (curr.next_task_id && allById.has(curr.next_task_id)) {
      const nextT = allById.get(curr.next_task_id)!;
      if (inChain.has(nextT.id) || visited.has(nextT.id)) break;
      chainTasks.push(nextT);
      inChain.add(nextT.id);
      curr = nextT;
    }

    if (chainTasks.length > 1) {
      chainTasks.forEach((t) => visited.add(t.id));
      chains.push({
        id: `chain-${head.id}`,
        headId: head.id,
        name: head.chain_name || `${head.title} → ...`,
        time: head.chain_time,
        tasks: chainTasks,
      });
    }
  }

  return chains;
}

/** Devuelve la cadena que contiene a la tarea, si existe. */
export function findChainForTask(chains: TaskChain[], taskId: string): TaskChain | null {
  return chains.find((c) => c.tasks.some((t) => t.id === taskId)) ?? null;
}
