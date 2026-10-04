"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TASK_PATHS = ["/hoy", "/proximos", "/tareas", "/eisenhower", "/calendario"];

function revalidateTasks() {
  for (const p of TASK_PATHS) revalidatePath(p);
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
  next_task_id: z.string().uuid().nullable().or(z.literal("")),
  estimated_hours: z.number().min(0).max(999).nullable(),
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

function normEmpty(v: string | null | ""): string | null {
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
    estimated_hours: hoursNum === null || Number.isNaN(hoursNum) ? null : hoursNum,
    checklist: parseChecklist(String(formData.get("checklist") ?? "")),
  });
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
  const nextId = normEmpty(parsed.data.next_task_id);
  if (await wouldCycle(supabase, null, nextId)) return { error: "cycle" };

  const { error } = await supabase.from("tasks").insert({
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
  });
  if (error) {
    if (error.message.includes("cycle")) return { error: "cycle" };
    return { error: "saveFail" };
  }
  revalidateTasks();
  return {};
}

export async function updateTask(id: string, formData: FormData) {
  const supabase = await createClient();
  const parsed = parseTaskInput(formData);
  if (!parsed.success) return { error: "saveFail" };
  const nextId = normEmpty(parsed.data.next_task_id);
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
  }).eq("id", id);
  if (error) {
    if (error.message.includes("cycle")) return { error: "cycle" };
    return { error: "saveFail" };
  }
  revalidateTasks();
  return {};
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
