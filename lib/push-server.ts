import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;

function vapid() {
  if (!configured) {
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
    const pub = process.env.NEXT_PUBLIC_VAPID_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) throw new Error("missing vapid keys");
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
}

/** Cliente admin (service role) para el cron. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("missing service role key");
  return createClient(url, key);
}

export type PushSub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Envía a todas las suscripciones; borra las muertas (410/404). Retorna enviadas. */
export async function sendToUser(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  subs: PushSub[],
  payload: { title: string; body: string; url: string }
): Promise<number> {
  vapid();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    })
  );
  return sent;
}

/** ¿Ahora cae en horario silencioso del usuario? Horas "HH:mm" en su zona. */
export function inQuietHours(
  quietStart: string | null,
  quietEnd: string | null,
  timeZone: string | null,
  now: Date = new Date()
): boolean {
  if (!quietStart || !quietEnd) return false;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timeZone ?? undefined,
    }).format(now);
    const cur = parts.slice(0, 5);
    if (quietStart <= quietEnd) return cur >= quietStart && cur < quietEnd;
    return cur >= quietStart || cur < quietEnd;
  } catch {
    return false;
  }
}
