"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button, Card, Input, Label, Spinner, TextField, toast } from "@heroui/react";
import { useLang } from "@/components/language";
import { getPushPrefs, removeSubscription, savePushPrefs, saveSubscription } from "@/actions/push";

function urlBase64ToU8(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Prefs = {
  notify_overdue: boolean;
  notify_reminders: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
};

/** Tarjeta de notificaciones push: permiso, tipos y horario silencioso. */
export function PushSettingsCard() {
  const { t } = useLang();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, startBusy] = useTransition();
  const [prefs, setPrefs] = useState<Prefs>({
    notify_overdue: true,
    notify_reminders: true,
    quiet_start: null,
    quiet_end: null,
  });
  const [savingPrefs, startSaving] = useTransition();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    if ("Notification" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission(Notification.permission);
    }
    getPushPrefs().then((p) => {
      if (p) setPrefs(p);
    });
    navigator.serviceWorker?.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    setError(undefined);
    if (!supported) {
      setError(t.push.unsupported);
      return;
    }
    const key = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!key) {
      setError(t.push.saveFail);
      return;
    }
    startBusy(async () => {
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          setError(t.push.denied);
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToU8(key),
        });
        const json = sub.toJSON();
        const res = await saveSubscription({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          user_agent: navigator.userAgent.slice(0, 500),
        });
        if (res?.error) setError(t.push.saveFail);
        else {
          setSubscribed(true);
          toast.success(t.push.enable);
        }
      } catch {
        setError(t.push.saveFail);
      }
    });
  }

  async function disable() {
    startBusy(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const endpoint = sub?.endpoint;
        if (sub) await sub.unsubscribe();
        if (endpoint) await removeSubscription(endpoint);
      } catch {
        // sigue desmarcando local
      }
      setSubscribed(false);
    });
  }

  function savePrefs(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    const fd = new FormData();
    fd.set("notify_overdue", merged.notify_overdue ? "1" : "");
    fd.set("notify_reminders", merged.notify_reminders ? "1" : "");
    fd.set("quiet_start", merged.quiet_start ?? "");
    fd.set("quiet_end", merged.quiet_end ?? "");
    try {
      fd.set("notify_tz", Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      // sin zona
    }
    startSaving(async () => {
      const res = await savePushPrefs(fd);
      if (res?.error) toast.danger(t.push.saveFail);
    });
  }

  return (
    <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs">
      <Card.Content className="p-4 sm:p-5">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          {subscribed ? <Bell size={15} className="text-accent" /> : <BellOff size={15} className="text-muted" />}
          {t.push.title}
        </p>
        <p className="mt-0.5 text-xs text-muted">{t.push.hint}</p>

        {!subscribed ? (
          <Button
            variant="primary"
            size="sm"
            className="mt-3 rounded-xl font-semibold shadow-xs"
            isDisabled={busy || !supported}
            onPress={enable}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" color="current" /> {t.push.enabling}
              </span>
            ) : (
              t.push.enable
            )}
          </Button>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <ToggleRow
                label={t.push.overdue}
                value={prefs.notify_overdue}
                onChange={(v) => savePrefs({ notify_overdue: v })}
                disabled={savingPrefs}
              />
              <ToggleRow
                label={t.push.reminders}
                value={prefs.notify_reminders}
                onChange={(v) => savePrefs({ notify_reminders: v })}
                disabled={savingPrefs}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField fullWidth name="qstart">
                <Label className="text-xs font-semibold">{t.push.quiet} — 1</Label>
                <Input
                  type="time"
                  value={prefs.quiet_start ?? ""}
                  onChange={(e) => savePrefs({ quiet_start: e.target.value || null })}
                  className="mt-1 rounded-xl glass-input tabular-nums"
                />
              </TextField>
              <TextField fullWidth name="qend">
                <Label className="text-xs font-semibold">{t.push.quiet} — 2</Label>
                <Input
                  type="time"
                  value={prefs.quiet_end ?? ""}
                  onChange={(e) => savePrefs({ quiet_end: e.target.value || null })}
                  className="mt-1 rounded-xl glass-input tabular-nums"
                />
              </TextField>
            </div>
            <p className="text-[11px] text-muted">{t.push.quietHint}</p>
            <Button
              variant="ghost"
              size="sm"
              className="self-start rounded-xl text-muted hover:text-danger"
              isDisabled={busy}
              onPress={disable}
            >
              {t.push.disable}
            </Button>
          </div>
        )}

        {error && (
          <p aria-live="polite" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
        {permission === "denied" && subscribed === false && (
          <p className="mt-2 text-xs text-danger">{t.push.denied}</p>
        )}
      </Card.Content>
    </Card>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-2 rounded-xl glass-input px-3 py-2 text-xs font-medium cursor-pointer disabled:opacity-60"
    >
      <span className={value ? "text-foreground" : "text-muted"}>{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
          value ? "bg-accent" : "bg-white/20 dark:bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

