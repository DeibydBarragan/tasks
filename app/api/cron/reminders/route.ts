import { NextResponse } from "next/server";
import { adminClient, inQuietHours, sendToUser, type PushSub } from "@/lib/push-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Prefs = {
  id: string;
  notify_overdue: boolean;
  notify_reminders: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  notify_tz: string | null;
};

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Vercel Cron no envía secreto: se acepta su user-agent. El daño máximo
  // de invocarlo a mano es nulo (los envíos son idempotentes).
  return (request.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = adminClient();
  const now = new Date();
  const report = { reminders: 0, overdue: 0, skippedQuiet: 0 };

  // Prefs de usuarios con suscripciones
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  const byUser = new Map<string, PushSub[]>();
  for (const s of (subs ?? []) as (PushSub & { user_id: string })[]) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id)!.push({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
  }
  if (byUser.size === 0) return NextResponse.json({ ok: true, report });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, notify_overdue, notify_reminders, quiet_start, quiet_end, notify_tz")
    .in("id", [...byUser.keys()]);
  const prefsByUser = new Map<string, Prefs>(
    ((profiles ?? []) as Prefs[]).map((p) => [p.id, p])
  );

  // 1. Recordatorios vencidos no enviados
  const { data: due } = await supabase
    .from("task_reminders")
    .select("id, user_id, task_id, remind_at, tasks(title)")
    .eq("sent", false)
    .lte("remind_at", now.toISOString())
    .limit(100);
  for (const r of (due ?? []) as {
    id: string;
    user_id: string;
    remind_at: string;
    tasks: { title: string } | { title: string }[] | null;
  }[]) {
    const prefs = prefsByUser.get(r.user_id);
    const list = byUser.get(r.user_id) ?? [];
    if (!prefs?.notify_reminders || list.length === 0) continue;
    if (inQuietHours(prefs.quiet_start, prefs.quiet_end, prefs.notify_tz, now)) {
      report.skippedQuiet++;
      continue;
    }
    const title = Array.isArray(r.tasks) ? r.tasks[0]?.title : r.tasks?.title;
    const sent = await sendToUser(supabase, r.user_id, list, {
      title: title ?? "Recordatorio",
      body: new Date(r.remind_at).toLocaleString(),
      url: "/hoy",
    });
    if (sent > 0) {
      report.reminders++;
      await supabase.from("task_reminders").update({ sent: true }).eq("id", r.id);
    }
  }

  // 2. Una push diaria por tareas vencidas pendientes
  for (const [userId, list] of byUser) {
    const prefs = prefsByUser.get(userId);
    if (!prefs?.notify_overdue || list.length === 0) continue;
    if (inQuietHours(prefs.quiet_start, prefs.quiet_end, prefs.notify_tz, now)) {
      report.skippedQuiet++;
      continue;
    }
    // "Hoy" en la zona del usuario
    let todayStr: string;
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: prefs.notify_tz ?? undefined,
      }).format(now);
      todayStr = parts;
    } catch {
      todayStr = now.toISOString().slice(0, 10);
    }
    const { data: overdue } = await supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("user_id", userId)
      .eq("status", "pending")
      .not("due_date", "is", null)
      .lt("due_date", todayStr)
      .or(`last_reminded_at.is.null,last_reminded_at.lt.${todayStr}T00:00:00`)
      .limit(20);
    const rows = (overdue ?? []) as { id: string; title: string; due_date: string }[];
    if (rows.length === 0) continue;
    const first = rows[0];
    const sent = await sendToUser(supabase, userId, list, {
      title:
        rows.length === 1
          ? `Vencida: ${first.title}`
          : `${rows.length} tareas vencidas (la primera: ${first.title})`,
      body: "Ponte al día en Hoy.",
      url: "/hoy",
    });
    if (sent > 0) {
      report.overdue += rows.length;
      await supabase
        .from("tasks")
        .update({ last_reminded_at: now.toISOString() })
        .in("id", rows.map((r) => r.id));
    }
  }

  return NextResponse.json({ ok: true, report });
}
