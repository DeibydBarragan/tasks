import { createClient } from "@/lib/supabase/server";
import { computeGlobalTaskStreak } from "@/lib/streak";
import { toLocalISODate } from "@/lib/dates";
import type { Streak, Task, TaskList } from "@/lib/types";

export async function getUserAndProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: profile as { name: string | null } | null };
}

/**
 * Fechas "YYYY-MM-DD" en las que el usuario completó >= 1 tarea.
 * Se deriva de completed_at para no depender de la zona horaria del cliente.
 */
export async function getCompletedTaskDates(): Promise<Set<string>> {
  const { supabase, user } = await getUserAndProfile();
  const dates = new Set<string>();
  if (!user) return dates;
  const { data } = await supabase
    .from("tasks")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(2000);
  for (const row of (data ?? []) as { completed_at: string | null }[]) {
    if (row.completed_at) dates.add(row.completed_at.slice(0, 10));
  }
  return dates;
}

export async function getStreak(todayISO: string = toLocalISODate()): Promise<Streak> {
  const dates = await getCompletedTaskDates();
  return computeGlobalTaskStreak(dates, todayISO);
}

export async function getTaskLists(): Promise<TaskList[]> {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return [];
  const { data } = await supabase
    .from("task_lists")
    .select("*")
    .eq("user_id", user.id)
    .order("position")
    .order("created_at");
  return (data ?? []) as TaskList[];
}

export async function getTasks(): Promise<Task[]> {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return [];
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as Task[];
}

export async function getTasksViewData(): Promise<{ lists: TaskList[]; tasks: Task[] }> {
  const [lists, tasks] = await Promise.all([getTaskLists(), getTasks()]);
  return { lists, tasks };
}
