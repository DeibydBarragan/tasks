"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ActiveFocus, FocusSession } from "@/lib/types";

const FOCUS_PATHS = ["/enfoque", "/hoy", "/proximos", "/tareas", "/eisenhower", "/calendario"];

function revalidateFocus() {
  revalidatePath("/enfoque", "layout");
  for (const p of FOCUS_PATHS) revalidatePath(p);
}

async function closeOpen(supabase: SupabaseClient, userId: string) {
  const { data: open } = await supabase
    .from("focus_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);
  for (const s of (open ?? []) as { id: string; started_at: string }[]) {
    const secs = Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000));
    await supabase
      .from("focus_sessions")
      .update({ ended_at: new Date().toISOString(), duration_seconds: secs })
      .eq("id", s.id);
  }
}

export async function getActiveFocusInternal(): Promise<ActiveFocus | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("focus_sessions")
    .select("*, tasks(title), task_lists(name, color)")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as FocusSession & {
    tasks: { title: string } | null;
    task_lists: { name: string; color: string } | null;
  };
  return {
    session: {
      id: row.id,
      user_id: row.user_id,
      task_id: row.task_id,
      list_id: row.list_id,
      started_at: row.started_at,
      ended_at: null,
      duration_seconds: null,
      note: row.note,
      created_at: row.created_at,
    } as FocusSession,
    task_title: row.tasks?.title ?? null,
    list_color: row.task_lists?.color ?? null,
    list_name: row.task_lists?.name ?? null,
    elapsed_seconds: Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000)),
  };
}

const uuidOrEmpty = z.string().uuid().nullable().or(z.literal(""));

function normUuid(v: string | null | ""): string | null {
  return !v ? null : v;
}

export async function startFocus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const parsed = uuidOrEmpty.safeParse(String(formData.get("task_id") ?? ""));
  if (!parsed.success) return { error: "saveFail" };
  const taskId = normUuid(parsed.data);

  let listId: string | null = null;
  if (taskId) {
    const { data: t } = await supabase
      .from("tasks")
      .select("id, list_id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!t) return { error: "notFound" };
    listId = (t as { list_id: string | null }).list_id;
  }

  await closeOpen(supabase, user.id);
  const { error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    task_id: taskId,
    list_id: listId,
  });
  if (error) return { error: "saveFail" };
  revalidateFocus();
  return {};
}

export async function stopFocus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  await closeOpen(supabase, user.id);
  revalidateFocus();
  return {};
}

export async function discardFocus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  await supabase.from("focus_sessions").delete().eq("user_id", user.id).is("ended_at", null);
  revalidateFocus();
  return {};
}

const manualSchema = z.object({
  task_id: z.string().uuid().nullable().or(z.literal("")),
  started_at: z.string().datetime({ offset: true }),
  ended_at: z.string().datetime({ offset: true }),
  note: z.string().trim().max(500).nullable(),
});

export async function createManualSession(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const parsed = manualSchema.safeParse({
    task_id: String(formData.get("task_id") ?? ""),
    started_at: String(formData.get("started_at") ?? ""),
    ended_at: String(formData.get("ended_at") ?? ""),
    note: String(formData.get("note") ?? "") || null,
  });
  if (!parsed.success) return { error: "saveFail" };
  const start = new Date(parsed.data.started_at).getTime();
  const end = new Date(parsed.data.ended_at).getTime();
  if (!(end > start) || end - start > 24 * 3600 * 1000) return { error: "saveFail" };
  const taskId = normUuid(parsed.data.task_id);
  let listId: string | null = null;
  if (taskId) {
    const { data: t } = await supabase
      .from("tasks")
      .select("id, list_id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!t) return { error: "notFound" };
    listId = (t as { list_id: string | null }).list_id;
  }
  const { error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    task_id: taskId,
    list_id: listId,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(end).toISOString(),
    duration_seconds: Math.floor((end - start) / 1000),
    note: parsed.data.note,
  });
  if (error) return { error: "saveFail" };
  revalidateFocus();
  return {};
}

export async function deleteSession(id: string) {
  const supabase = await createClient();
  await supabase.from("focus_sessions").delete().eq("id", id);
  revalidateFocus();
}

export async function getFocusRange(fromISO: string, toISO: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("focus_sessions")
    .select("*, tasks(title), task_lists(name, color)")
    .eq("user_id", user.id)
    .gte("started_at", fromISO)
    .lt("started_at", toISO)
    .order("started_at");
  return (data ?? []) as unknown[];
}
