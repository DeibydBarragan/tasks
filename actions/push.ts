"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const subSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(5).max(500),
  user_agent: z.string().max(500).nullable().optional(),
});

/** Guarda la suscripción push de este dispositivo/navegador. */
export async function saveSubscription(data: {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const parsed = subSchema.safeParse({
    endpoint: data.endpoint,
    p256dh: data.p256dh,
    auth: data.auth,
    user_agent: data.user_agent ?? null,
  });
  if (!parsed.success) return { error: "saveFail" };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.user_agent ?? null,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) return { error: "saveFail" };
  return {};
}

/** Borra la suscripción push de este dispositivo/navegador. */
export async function removeSubscription(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  return {};
}


/** Lee preferencias globales de notificaciones. */
export async function getPushPrefs() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("notify_overdue, notify_reminders, quiet_start, quiet_end").eq("id", user.id).maybeSingle();
  return (data ?? { notify_overdue: true, notify_reminders: true, quiet_start: null, quiet_end: null }) as { notify_overdue: boolean; notify_reminders: boolean; quiet_start: string | null; quiet_end: string | null };
}

const prefsSchema = z.object({
  notify_overdue: z.boolean(),
  notify_reminders: z.boolean(),
  quiet_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().or(z.literal("")),
  quiet_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().or(z.literal("")),
  notify_tz: z.string().max(100).nullable().optional(),
});

/** Guarda preferencias globales de notificaciones. */
export async function savePushPrefs(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const parsed = prefsSchema.safeParse({
    notify_overdue: formData.get("notify_overdue") === "1",
    notify_reminders: formData.get("notify_reminders") === "1",
    quiet_start: String(formData.get("quiet_start") ?? ""),
    quiet_end: String(formData.get("quiet_end") ?? ""),
    notify_tz: String(formData.get("notify_tz") ?? "") || null,
  });
  if (!parsed.success) return { error: "saveFail" };
  const norm = (v: string | null | ""): string | null => (!v ? null : v);
  const update: Record<string, unknown> = {
    notify_overdue: parsed.data.notify_overdue,
    notify_reminders: parsed.data.notify_reminders,
    quiet_start: norm(parsed.data.quiet_start),
    quiet_end: norm(parsed.data.quiet_end),
  };
  if (parsed.data.notify_tz) update.notify_tz = parsed.data.notify_tz;
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: "saveFail" };
  return {};
}
