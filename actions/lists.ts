"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PALETTE_12 } from "@/lib/types";
import { LIST_ICON_KEYS } from "@/lib/list-icons";

const TASK_PATHS = ["/hoy", "/proximos", "/tareas", "/eisenhower", "/calendario"];

function revalidateTasks() {
  for (const p of TASK_PATHS) revalidatePath(p);
}

const listSchema = z.object({
  name: z.string().trim().min(1, "needName").max(40),
  icon: z.enum(LIST_ICON_KEYS as unknown as [string, ...string[]]),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .refine(
      (v) =>
        (PALETTE_12 as readonly string[]).includes(v.toUpperCase()) ||
        (PALETTE_12 as readonly string[]).includes(v),
      "bad color"
    ),
});

export async function createList(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const parsed = listSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    icon: String(formData.get("icon") ?? "folder"),
    color: String(formData.get("color") ?? "#2563eb"),
  });
  if (!parsed.success) return { error: "needName" };

  // Posición al final
  const { count } = await supabase
    .from("task_lists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase.from("task_lists").insert({
    user_id: user.id,
    ...parsed.data,
    color: parsed.data.color.toUpperCase(),
    position: count ?? 0,
  });
  if (error) {
    if (error.code === "23505") return { error: "listExists" };
    return { error: "saveFail" };
  }
  revalidateTasks();
  return {};
}

export async function updateList(id: string, formData: FormData) {
  const supabase = await createClient();
  const parsed = listSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    icon: String(formData.get("icon") ?? "folder"),
    color: String(formData.get("color") ?? "#2563eb"),
  });
  if (!parsed.success) return { error: "needName" };
  const { error } = await supabase
    .from("task_lists")
    .update({ ...parsed.data, color: parsed.data.color.toUpperCase() })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "listExists" };
    return { error: "saveFail" };
  }
  revalidateTasks();
  return {};
}

export async function deleteList(id: string) {
  const supabase = await createClient();
  await supabase.from("task_lists").delete().eq("id", id);
  revalidateTasks();
}
