"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { orderRespectsSort } from "@/lib/task-filters";
import { getLang } from "@/lib/i18n/server";
import { buildTaskChains, findChainForTask } from "@/lib/chains";
import type { Task } from "@/lib/types";

const TASK_PATHS = ["/hoy", "/proximos", "/tareas", "/eisenhower", "/calendario"];

function revalidateTasks(paths: string[] = TASK_PATHS) {
  for (const p of paths) revalidatePath(p);
}

const taskSchema = z.object({
  title: z.string().trim().min(1, "needTitle").max(120),
  description: z.string().trim().max(2000).nullable(),
  list_id: z.string().uuid().nullable().or(z.literal("")),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .or(z.literal("")),
  due_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(4),
  is_urgent: z.boolean(),
  is_important: z.boolean(),
  next_task_id: z.string().uuid().nullable().or(z.literal("")).optional(),
  previous_task_id: z.string().uuid().nullable().or(z.literal("")).optional(),
  estimated_hours: z.number().min(0).max(999).nullable(),
  reminders: z.array(z.string().datetime({ offset: true })).max(10).nullable().optional(),
  checklist: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        text: z.string().trim().min(1).max(120),
        done: z.boolean(),
      })
    )
    .max(30)
    .nullable()
    .optional(),
});

function normEmpty(v: string | null | undefined | ""): string | null {
  if (!v) return null;
  const t = v.trim();
  return t ? t : null;
}

async function wouldCycle(supabase: SupabaseClient, selfId: string | null, nextId: string | null): Promise<boolean> {
  if (!nextId) return false;
  if (selfId && nextId === selfId) return true;
  let cur: string | null = nextId;
  const seen = new Set<string>();
  for (let i = 0; i < 50 && cur; i++) {
    if (cur === selfId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    const { data }: { data: { next_task_id: string | null } | null } = await supabase.from("tasks").select("next_task_id").eq("id", cur).maybeSingle();
    cur = data?.next_task_id ?? null;
  }
  return false;
}

function parseChecklist(raw: string): { id: string; text: string; done: boolean }[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const json = JSON.parse(trimmed);
    if (!Array.isArray(json)) return null;
    return json
      .filter((x) => x && typeof x.text === "string" && x.text.trim().length > 0)
      .slice(0, 30)
      .map((x, i) => ({
        id: String(x.id ?? `cl_${Date.now()}_${i}`),
        text: String(x.text).trim().slice(0, 120),
        done: x.done === true,
      }));
  } catch {
    return null;
  }
}

function parseTaskInput(formData: FormData) {
  const hoursRaw = String(formData.get("estimated_hours") ?? "").trim();
  const hoursNum = hoursRaw === "" ? null : Math.round(Number(hoursRaw) * 10) / 10;
  return taskSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: normEmpty(String(formData.get("description") ?? "")),
    list_id: String(formData.get("list_id") ?? ""),
    due_date: String(formData.get("due_date") ?? ""),
    due_time: String(formData.get("due_time") ?? ""),
    priority: Number(formData.get("priority") ?? 4),
    is_urgent: formData.get("is_urgent") === "1" || formData.get("is_urgent") === "on",
    is_important: formData.get("is_important") === "1" || formData.get("is_important") === "on",
    next_task_id: String(formData.get("next_task_id") ?? ""),
    previous_task_id: String(formData.get("previous_task_id") ?? ""),
    estimated_hours: hoursNum === null || Number.isNaN(hoursNum) ? null : hoursNum,
    reminders: parseReminders(String(formData.get("reminders") ?? "")),
    checklist: parseChecklist(String(formData.get("checklist") ?? "")),
  });
}

function parseReminders(raw: string): string[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const json = JSON.parse(trimmed);
    if (!Array.isArray(json)) return null;
    const out: string[] = [];
    for (const x of json) {
      if (typeof x !== "string") return null;
      const ms = Date.parse(x);
      if (Number.isNaN(ms)) return null;
      out.push(new Date(ms).toISOString());
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return null;
  }
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const parsed = parseTaskInput(formData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return { error: issue === "needTitle" ? "needTitle" : "saveFail" };
  }

  const prevId = normEmpty(parsed.data.previous_task_id);
  let nextId = normEmpty(parsed.data.next_task_id);

  if (prevId) {
    const { data: prevTask } = await supabase
      .from("tasks")
      .select("id, next_task_id")
      .eq("id", prevId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (prevTask) {
      nextId = prevTask.next_task_id ?? null;
    }
  }

  if (await wouldCycle(supabase, null, nextId)) return { error: "cycle" };

  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: normEmpty(parsed.data.description),
    list_id: normEmpty(parsed.data.list_id),
    due_date: normEmpty(parsed.data.due_date),
    due_time: normEmpty(parsed.data.due_time),
    priority: parsed.data.priority,
    is_urgent: parsed.data.is_urgent,
    is_important: parsed.data.is_important,
    next_task_id: nextId,
    estimated_hours: parsed.data.estimated_hours,
    checklist: parsed.data.checklist ?? [],
    position: ((last?.position as number | undefined) ?? 0) + 1024,
  }).select("id").single();
  if (error) {
    if (error.message.includes("cycle")) return { error: "cycle" };
    return { error: "saveFail" };
  }

  if (prevId && created) {
    await supabase
      .from("tasks")
      .update({
        next_task_id: (created as { id: string }).id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prevId)
      .eq("user_id", user.id);
  }

  if (parsed.data.reminders?.length) {
    await supabase.from("task_reminders").insert(
      parsed.data.reminders.map((remind_at) => ({
        user_id: user.id,
        task_id: (created as { id: string }).id,
        remind_at,
      }))
    );
  }
  revalidateTasks();
  return {};
}

export async function updateTask(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const parsed = parseTaskInput(formData);
  if (!parsed.success) return { error: "saveFail" };

  const { data: currentSelf } = await supabase
    .from("tasks")
    .select("id, next_task_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!currentSelf) return { error: "notFound" };

  let nextId = normEmpty(parsed.data.next_task_id) ?? currentSelf.next_task_id;
  const hasPreviousParam = formData.has("previous_task_id");
  const prevId = normEmpty(parsed.data.previous_task_id);

  if (hasPreviousParam) {
    // Buscar la tarea que actualmente precede a esta
    const { data: currentPrev } = await supabase
      .from("tasks")
      .select("id, next_task_id")
      .eq("next_task_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentPrev?.id !== prevId) {
      // Desvincular predecesor anterior si existía y cambió
      if (currentPrev) {
        await supabase
          .from("tasks")
          .update({ next_task_id: null, updated_at: new Date().toISOString() })
          .eq("id", currentPrev.id)
          .eq("user_id", user.id);
      }

      if (prevId) {
        if (prevId === id) return { error: "cycle" };
        if (await wouldCycle(supabase, prevId, id)) return { error: "cycle" };

        const { data: newPrev } = await supabase
          .from("tasks")
          .select("id, next_task_id")
          .eq("id", prevId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (newPrev) {
          // Si newPrev ya tenía un siguiente diferente a id, id se intercala
          if (newPrev.next_task_id && newPrev.next_task_id !== id) {
            nextId = newPrev.next_task_id;
          }

          // Conectar newPrev -> id
          await supabase
            .from("tasks")
            .update({
              next_task_id: id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", prevId)
            .eq("user_id", user.id);
        }
      }
    }
  }

  if (await wouldCycle(supabase, id, nextId)) return { error: "cycle" };

  const { error } = await supabase.from("tasks").update({
    title: parsed.data.title,
    description: normEmpty(parsed.data.description),
    list_id: normEmpty(parsed.data.list_id),
    due_date: normEmpty(parsed.data.due_date),
    due_time: normEmpty(parsed.data.due_time),
    priority: parsed.data.priority,
    is_urgent: parsed.data.is_urgent,
    is_important: parsed.data.is_important,
    next_task_id: nextId,
    estimated_hours: parsed.data.estimated_hours,
    checklist: parsed.data.checklist ?? [],
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id);

  if (error) {
    if (error.message.includes("cycle")) return { error: "cycle" };
    return { error: "saveFail" };
  }
  const { data: { user: u2 } } = await supabase.auth.getUser();
  if (u2 && parsed.data.reminders) {
    await supabase.from("task_reminders").delete().eq("task_id", id).eq("sent", false);
    if (parsed.data.reminders.length > 0) {
      await supabase.from("task_reminders").insert(
        parsed.data.reminders.map((remind_at) => ({
          user_id: u2.id,
          task_id: id,
          remind_at,
        }))
      );
    }
  }
  revalidateTasks();
  return {};
}

export async function getTaskReminders(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("task_reminders")
    .select("id, remind_at, sent")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .order("remind_at");
  return (data ?? []) as { id: string; remind_at: string; sent: boolean }[];
}

export async function deleteReminder(id: string) {
  const supabase = await createClient();
  await supabase.from("task_reminders").delete().eq("id", id);
  revalidateTasks();
}

export async function toggleTaskStatus(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, status, next_task_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!task) return { error: "notFound" };

  const toCompleted = task.status !== "completed";
  const { error } = await supabase.from("tasks").update({
    status: toCompleted ? "completed" : "pending",
    completed_at: toCompleted ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: "saveFail" };

  let next: { id: string; title: string } | null = null;
  if (toCompleted && task.next_task_id) {
    const { data: nt } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("id", task.next_task_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (nt) next = nt as { id: string; title: string };
  }

  revalidateTasks();
  return { completed: toCompleted, next };
}

/** Alterna un paso del checklist interno de una tarea. */
export async function toggleChecklistItem(id: string, itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const { data: task } = await supabase
    .from("tasks")
    .select("id, checklist")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!task) return { error: "notFound" };
  const checklist = ((task.checklist ?? []) as { id: string; text: string; done: boolean }[]).map(
    (item) => (item.id === itemId ? { ...item, done: !item.done } : item)
  );
  const { error } = await supabase.from("tasks").update({
    checklist,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: "saveFail" };
  revalidateTasks();
  return {};
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  // Limpia referencias next_task_id que apunten a esta tarea
  await supabase.from("tasks").update({ next_task_id: null }).eq("next_task_id", id);
  await supabase.from("tasks").delete().eq("id", id);
  revalidateTasks();
}

/** Metadatos de la cadena (nombre y hora) guardados en la tarea cabeza. */
export async function updateChainMetadata(
  headTaskId: string,
  chainName: string | null,
  chainTime: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const trimmedName = chainName?.trim() || null;
  const trimmedTime = chainTime?.trim() || null;

  const { error } = await supabase
    .from("tasks")
    .update({ chain_name: trimmedName, chain_time: trimmedTime })
    .eq("id", headTaskId)
    .eq("user_id", user.id);

    if (error) return { error: "saveFail" };
  revalidateTasks();
  return {};
}

/** Añade una tarea al inicio o al final de una cadena de tareas (creando nueva o vinculando existente). */
export async function addTaskToChain({
  headTaskId,
  tailTaskId,
  position,
  formData,
  existingTaskId,
}: {
  headTaskId: string;
  tailTaskId: string;
  position: "start" | "end";
  formData?: FormData;
  existingTaskId?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  if (formData) {
    const parsed = parseTaskInput(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message;
      return { error: issue === "needTitle" ? "needTitle" : "saveFail" };
    }

    if (position === "start") {
      const { data: headTask, error: headErr } = await supabase
        .from("tasks")
        .select("id, chain_name, chain_time, position")
        .eq("id", headTaskId)
        .eq("user_id", user.id)
        .single();
      if (headErr || !headTask) return { error: "saveFail" };

      const { data: created, error: insertErr } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          description: normEmpty(parsed.data.description),
          list_id: normEmpty(parsed.data.list_id),
          due_date: normEmpty(parsed.data.due_date),
          due_time: normEmpty(parsed.data.due_time),
          priority: parsed.data.priority,
          is_urgent: parsed.data.is_urgent,
          is_important: parsed.data.is_important,
          next_task_id: headTaskId,
          chain_name: headTask.chain_name ?? null,
          chain_time: headTask.chain_time ?? null,
          estimated_hours: parsed.data.estimated_hours,
          checklist: parsed.data.checklist ?? [],
          position: ((headTask.position as number | undefined) ?? 1024) - 512,
        })
        .select("id")
        .single();

      if (insertErr || !created) {
        if (insertErr?.message?.includes("cycle")) return { error: "cycle" };
        return { error: "saveFail" };
      }

      if (headTask.chain_name || headTask.chain_time) {
        await supabase
          .from("tasks")
          .update({
            chain_name: null,
            chain_time: null,
          })
          .eq("id", headTaskId)
          .eq("user_id", user.id);
      }

      if (parsed.data.reminders?.length) {
        await supabase.from("task_reminders").insert(
          parsed.data.reminders.map((remind_at) => ({
            user_id: user.id,
            task_id: (created as { id: string }).id,
            remind_at,
          }))
        );
      }
    } else {
      // position === "end"
      const { data: tailTask, error: tailErr } = await supabase
        .from("tasks")
        .select("id, position")
        .eq("id", tailTaskId)
        .eq("user_id", user.id)
        .single();
      if (tailErr || !tailTask) return { error: "saveFail" };

      const { data: created, error: insertErr } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          description: normEmpty(parsed.data.description),
          list_id: normEmpty(parsed.data.list_id),
          due_date: normEmpty(parsed.data.due_date),
          due_time: normEmpty(parsed.data.due_time),
          priority: parsed.data.priority,
          is_urgent: parsed.data.is_urgent,
          is_important: parsed.data.is_important,
          next_task_id: null,
          estimated_hours: parsed.data.estimated_hours,
          checklist: parsed.data.checklist ?? [],
          position: ((tailTask.position as number | undefined) ?? 0) + 512,
        })
        .select("id")
        .single();

      if (insertErr || !created) {
        if (insertErr?.message?.includes("cycle")) return { error: "cycle" };
        return { error: "saveFail" };
      }

      const { error: tailUpdateErr } = await supabase
        .from("tasks")
        .update({
          next_task_id: (created as { id: string }).id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tailTaskId)
        .eq("user_id", user.id);

      if (tailUpdateErr) {
        if (tailUpdateErr.message?.includes("cycle")) return { error: "cycle" };
        return { error: "saveFail" };
      }

      if (parsed.data.reminders?.length) {
        await supabase.from("task_reminders").insert(
          parsed.data.reminders.map((remind_at) => ({
            user_id: user.id,
            task_id: (created as { id: string }).id,
            remind_at,
          }))
        );
      }
    }
  } else if (existingTaskId) {
    if (position === "start") {
      if (existingTaskId === headTaskId) return { error: "cycle" };
      if (await wouldCycle(supabase, existingTaskId, headTaskId)) return { error: "cycle" };

      const { data: headTask, error: headErr } = await supabase
        .from("tasks")
        .select("id, chain_name, chain_time")
        .eq("id", headTaskId)
        .eq("user_id", user.id)
        .single();
      if (headErr || !headTask) return { error: "saveFail" };

      const { error: updateErr } = await supabase
        .from("tasks")
        .update({
          next_task_id: headTaskId,
          chain_name: headTask.chain_name ?? null,
          chain_time: headTask.chain_time ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTaskId)
        .eq("user_id", user.id);

      if (updateErr) {
        if (updateErr.message?.includes("cycle")) return { error: "cycle" };
        return { error: "saveFail" };
      }

      if (headTask.chain_name || headTask.chain_time) {
        await supabase
          .from("tasks")
          .update({
            chain_name: null,
            chain_time: null,
          })
          .eq("id", headTaskId)
          .eq("user_id", user.id);
      }
    } else {
      // position === "end"
      if (existingTaskId === tailTaskId) return { error: "cycle" };
      if (await wouldCycle(supabase, tailTaskId, existingTaskId)) return { error: "cycle" };

      const { error: updateTailErr } = await supabase
        .from("tasks")
        .update({
          next_task_id: existingTaskId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tailTaskId)
        .eq("user_id", user.id);

      if (updateTailErr) {
        if (updateTailErr.message?.includes("cycle")) return { error: "cycle" };
        return { error: "saveFail" };
      }

      await supabase
        .from("tasks")
        .update({
          next_task_id: null,
          chain_name: null,
          chain_time: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTaskId)
        .eq("user_id", user.id);
    }
  } else {
    return { error: "saveFail" };
  }

  revalidateTasks();
  return {};
}

/** Mueve una tarea a otra lista (soltar en columna kanban). listId null = sin lista. */
export async function moveTaskList(id: string, listId: string | null) {
  const supabase = await createClient();
  if (listId) {
    const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listId);
    if (!uuidOk) return { error: "saveFail" };
  }
  const { error } = await supabase.from("tasks").update({
    list_id: listId,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: "saveFail" };
  revalidateTasks();
  return {};
}

/** Mueve una tarea a otro cuadrante de Eisenhower (cambia sus flags). */
export async function moveTaskQuadrant(id: string, isUrgent: boolean, isImportant: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({
    is_urgent: isUrgent,
    is_important: isImportant,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: "saveFail" };
  revalidateTasks();
  return {};
}

/** Reordena manualmente: persiste el orden dado si respeta el sort activo. */
export async function reorderTasks(
  orderedIds: string[],
  sort: "due_date" | "priority" | "title" | "created_at" | "manual"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  if (orderedIds.length < 2) return {};

  const { data } = await supabase
    .from("tasks")
    .select("id, due_date, due_time, priority, title, status, created_at")
    .eq("user_id", user.id)
    .in("id", orderedIds);
  const rows = (data ?? []) as ({ id: string } & {
    due_date: string | null;
    due_time: string | null;
    priority: 1 | 2 | 3 | 4;
    title: string;
    status: "pending" | "completed";
    created_at: string;
  })[];
  const byId = new Map(rows.map((t) => [t.id, t]));
  const ordered: (typeof rows)[number][] = [];
  for (const id of orderedIds) {
    const t = byId.get(id);
    if (!t) return { error: "notFound" };
    ordered.push(t);
  }

  const lang = await getLang();
  if (!orderRespectsSort(ordered, sort, lang)) return { error: "orderConflict" };

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("tasks")
      .update({ position: (i + 1) * 1024 })
      .eq("id", orderedIds[i]);
    if (error) return { error: "saveFail" };
  }
  revalidateTasks();
  return {};
}

/** Elimina todas las tareas completadas del usuario (limpiar historial). */
export async function clearCompleted() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const { data: done } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "completed");
  const ids = ((done ?? []) as { id: string }[]).map((d) => d.id);
  if (ids.length === 0) return {};
  await supabase.from("tasks").update({ next_task_id: null }).in("next_task_id", ids);
  await supabase.from("tasks").delete().in("id", ids).eq("user_id", user.id);
  revalidateTasks();
  return {};
}

/**
 * Elimina la conexión (flecha) entre fromTaskId y su siguiente tarea.
 * Si fromTaskId tenía metadatos de cadena (nombre/hora), los transfiere a la tarea siguiente
 * si esta continúa con un flujo de tareas restante.
 */
export async function disconnectTasks(fromTaskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const { data: fromTask } = await supabase
    .from("tasks")
    .select("id, next_task_id, chain_name, chain_time")
    .eq("id", fromTaskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!fromTask || !fromTask.next_task_id) return {};

  const toTaskId = fromTask.next_task_id;

  // Comprobar si toTask continúa con más tareas encadenadas
  const { data: toTask } = await supabase
    .from("tasks")
    .select("id, next_task_id")
    .eq("id", toTaskId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Si fromTask tenía nombre u hora de cadena, transferirlo a toTask solo si toTask continúa un flujo
  if (fromTask.chain_name || fromTask.chain_time) {
    if (toTask?.next_task_id) {
      await supabase
        .from("tasks")
        .update({
          chain_name: fromTask.chain_name,
          chain_time: fromTask.chain_time,
          updated_at: new Date().toISOString(),
        })
        .eq("id", toTaskId)
        .eq("user_id", user.id);
    }
  }

  // Desconectar fromTask
  const { error } = await supabase
    .from("tasks")
    .update({
      next_task_id: null,
      chain_name: null,
      chain_time: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fromTaskId)
    .eq("user_id", user.id);

  if (error) return { error: "saveFail" };

  revalidateTasks();
  return {};
}

/**
 * Mueve o encadena una tarea mediante drag and drop.
 * Soporta:
 * - Reordenar dentro de la misma cadena
 * - Mover una tarea de una cadena a otra cadena
 * - Insertar una tarea independiente dentro de una cadena (antes o después de targetTaskId)
 * - Encadenar dos tareas independientes (creando una nueva cadena)
 */
export async function moveOrChainTask({
  sourceTaskId,
  targetTaskId,
  position,
}: {
  sourceTaskId: string;
  targetTaskId: string;
  position: "before" | "after";
}) {
  if (sourceTaskId === targetTaskId) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  // Obtener todas las tareas del usuario para reconstruir cadenas
  const { data: allTasks, error: fetchErr } = await supabase
    .from("tasks")
    .select("id, title, next_task_id, chain_name, chain_time, status, user_id, list_id, description, due_date, due_time, priority, is_urgent, is_important, completed_at, checklist, estimated_hours, position, created_at, updated_at")
    .eq("user_id", user.id);

  if (fetchErr || !allTasks) return { error: "saveFail" };

  const tasksList = allTasks as unknown as Task[];
  const sourceTask = tasksList.find((t) => t.id === sourceTaskId);
  const targetTask = tasksList.find((t) => t.id === targetTaskId);

  if (!sourceTask || !targetTask) return { error: "notFound" };

  const currentChains = buildTaskChains(tasksList);
  const sourceChain = findChainForTask(currentChains, sourceTaskId);
  const targetChain = findChainForTask(currentChains, targetTaskId);

  // 1. CASO: Misma cadena (reordenar)
  if (sourceChain && targetChain && sourceChain.id === targetChain.id) {
    const list = sourceChain.tasks.map((t) => t.id).filter((id) => id !== sourceTaskId);
    const targetIdx = list.indexOf(targetTaskId);
    if (targetIdx === -1) return { error: "notFound" };

    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
    list.splice(insertIdx, 0, sourceTaskId);

    const oldHeadId = sourceChain.tasks[0].id;
    const newHeadId = list[0];
    const headTask = sourceChain.tasks[0];

    // Primero desvincular temporalmente para evitar cualquier conflicto de ciclo con PostgreSQL trigger
    await supabase.from("tasks").update({ next_task_id: null }).in("id", list).eq("user_id", user.id);

    // Asignar nuevos punteros
    for (let i = 0; i < list.length; i++) {
      const nextId = i < list.length - 1 ? list[i + 1] : null;
      const isNewHead = list[i] === newHeadId;
      const wasOldHead = list[i] === oldHeadId;

      const updateData: {
        next_task_id: string | null;
        updated_at: string;
        chain_name?: string | null;
        chain_time?: string | null;
      } = {
        next_task_id: nextId,
        updated_at: new Date().toISOString(),
      };

      if (newHeadId !== oldHeadId) {
        if (isNewHead) {
          updateData.chain_name = headTask.chain_name ?? null;
          updateData.chain_time = headTask.chain_time ?? null;
        } else if (wasOldHead) {
          updateData.chain_name = null;
          updateData.chain_time = null;
        }
      }

      await supabase.from("tasks").update(updateData).eq("id", list[i]).eq("user_id", user.id);
    }

    revalidateTasks();
    return {};
  }

  // 2. Si sourceTask pertenecía a otra cadena, retirarla y reparar esa cadena
  if (sourceChain) {
    const rem = sourceChain.tasks.map((t) => t.id).filter((id) => id !== sourceTaskId);
    const oldHead = sourceChain.tasks[0];

    // Desvincular temporalmente
    await supabase.from("tasks").update({ next_task_id: null }).in("id", sourceChain.tasks.map((t) => t.id)).eq("user_id", user.id);

    if (rem.length >= 2) {
      const newHeadId = rem[0];
      for (let i = 0; i < rem.length; i++) {
        const nextId = i < rem.length - 1 ? rem[i + 1] : null;
        const updateData: {
          next_task_id: string | null;
          updated_at: string;
          chain_name?: string | null;
          chain_time?: string | null;
        } = {
          next_task_id: nextId,
          updated_at: new Date().toISOString(),
        };
        if (oldHead.id === sourceTaskId && rem[i] === newHeadId) {
          updateData.chain_name = oldHead.chain_name ?? null;
          updateData.chain_time = oldHead.chain_time ?? null;
        }
        await supabase.from("tasks").update(updateData).eq("id", rem[i]).eq("user_id", user.id);
      }
    } else if (rem.length === 1) {
      // Queda una sola tarea: se vuelve independiente
      await supabase.from("tasks").update({
        next_task_id: null,
        chain_name: null,
        chain_time: null,
        updated_at: new Date().toISOString(),
      }).eq("id", rem[0]).eq("user_id", user.id);
    }
  }

  // 3. Insertar sourceTask en target
  if (targetChain) {
    // targetTask está en una cadena existente
    const list = targetChain.tasks.map((t) => t.id);
    const targetIdx = list.indexOf(targetTaskId);
    if (targetIdx === -1) return { error: "notFound" };

    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
    list.splice(insertIdx, 0, sourceTaskId);

    const oldHead = targetChain.tasks[0];
    const newHeadId = list[0];

    // Desvincular temporalmente los afectados
    await supabase.from("tasks").update({ next_task_id: null }).in("id", list).eq("user_id", user.id);

    for (let i = 0; i < list.length; i++) {
      const nextId = i < list.length - 1 ? list[i + 1] : null;
      const updateData: {
        next_task_id: string | null;
        updated_at: string;
        chain_name?: string | null;
        chain_time?: string | null;
      } = {
        next_task_id: nextId,
        updated_at: new Date().toISOString(),
      };

      if (newHeadId !== oldHead.id) {
        if (list[i] === newHeadId) {
          updateData.chain_name = oldHead.chain_name ?? null;
          updateData.chain_time = oldHead.chain_time ?? null;
        } else if (list[i] === oldHead.id) {
          updateData.chain_name = null;
          updateData.chain_time = null;
        }
      }

      await supabase.from("tasks").update(updateData).eq("id", list[i]).eq("user_id", user.id);
    }
  } else {
    // targetTask es independiente -> se crea una nueva cadena de 2 tareas
    await supabase.from("tasks").update({ next_task_id: null }).in("id", [sourceTaskId, targetTaskId]).eq("user_id", user.id);

    if (position === "before") {
      // sourceTask -> targetTask
      await supabase.from("tasks").update({
        next_task_id: targetTaskId,
        updated_at: new Date().toISOString(),
      }).eq("id", sourceTaskId).eq("user_id", user.id);

      await supabase.from("tasks").update({
        next_task_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", targetTaskId).eq("user_id", user.id);
    } else {
      // targetTask -> sourceTask
      await supabase.from("tasks").update({
        next_task_id: sourceTaskId,
        updated_at: new Date().toISOString(),
      }).eq("id", targetTaskId).eq("user_id", user.id);

      await supabase.from("tasks").update({
        next_task_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", sourceTaskId).eq("user_id", user.id);
    }
  }

  revalidateTasks();
  return {};
}

/**
 * Extrae una tarea de cualquier cadena a la que pertenezca, volviéndola independiente
 * y manteniendo conectados a los demás miembros de la cadena.
 */
export async function unchainTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const { data: allTasks } = await supabase
    .from("tasks")
    .select("id, title, next_task_id, chain_name, chain_time, status, user_id, list_id, description, due_date, due_time, priority, is_urgent, is_important, completed_at, checklist, estimated_hours, position, created_at, updated_at")
    .eq("user_id", user.id);

  if (!allTasks) return {};
  const currentChains = buildTaskChains(allTasks as unknown as Task[]);
  const chain = findChainForTask(currentChains, taskId);
  if (!chain) return {};

  const rem = chain.tasks.map((t) => t.id).filter((id) => id !== taskId);
  const oldHead = chain.tasks[0];

  // Desvincular temporalmente
  await supabase.from("tasks").update({ next_task_id: null }).in("id", chain.tasks.map((t) => t.id)).eq("user_id", user.id);

  // taskId queda completamente limpia
  await supabase.from("tasks").update({
    next_task_id: null,
    chain_name: null,
    chain_time: null,
    updated_at: new Date().toISOString(),
  }).eq("id", taskId).eq("user_id", user.id);

  if (rem.length >= 2) {
    const newHeadId = rem[0];
    for (let i = 0; i < rem.length; i++) {
      const nextId = i < rem.length - 1 ? rem[i + 1] : null;
      const updateData: {
        next_task_id: string | null;
        updated_at: string;
        chain_name?: string | null;
        chain_time?: string | null;
      } = {
        next_task_id: nextId,
        updated_at: new Date().toISOString(),
      };
      if (oldHead.id === taskId && rem[i] === newHeadId) {
        updateData.chain_name = oldHead.chain_name ?? null;
        updateData.chain_time = oldHead.chain_time ?? null;
      }
      await supabase.from("tasks").update(updateData).eq("id", rem[i]).eq("user_id", user.id);
    }
  } else if (rem.length === 1) {
    await supabase.from("tasks").update({
      next_task_id: null,
      chain_name: null,
      chain_time: null,
      updated_at: new Date().toISOString(),
    }).eq("id", rem[0]).eq("user_id", user.id);
  }

  revalidateTasks();
  return {};
}
