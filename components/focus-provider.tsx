"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button, Spinner, toast } from "@heroui/react";
import { Square, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/language";
import { stopFocus } from "@/actions/focus";
import type { ActiveFocus } from "@/lib/types";

type Ctx = {
  active: ActiveFocus | null;
  elapsed: number;
  refresh: () => Promise<void>;
  stopping: boolean;
  stop: () => Promise<void>;
};

const FocusCtx = createContext<Ctx>({
  active: null,
  elapsed: 0,
  refresh: async () => {},
  stopping: false,
  stop: async () => {},
});

export function useFocus() {
  return useContext(FocusCtx);
}

export function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Provee el timer global: polling + tick local cada segundo. */
export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveFocus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const activeRef = useRef<ActiveFocus | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/focus/active", { cache: "no-store" });
      const json = (await res.json()) as { active: ActiveFocus | null };
      setActive(json.active);
      setElapsed(json.active?.elapsed_seconds ?? 0);
    } catch {
      // sin red: conserva el estado
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // 20 s con timer activo, 60 s en reposo (cuota)
    const poll = setInterval(refresh, active ? 20000 : 60000);
    // Refresca al volver a la pestaña
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, !!active]);

  const activeId = active?.session.id ?? null;
  const hasActive = active !== null;

  useEffect(() => {
    if (!hasActive) return;
    const tick = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(tick);
  }, [activeId, hasActive]);

  async function stop() {
    if (!activeRef.current || stopping) return;
    setStopping(true);
    const res = await stopFocus();
    setStopping(false);
    if (res?.error) {
      toast.danger("Error");
    } else {
      setActive(null);
      setElapsed(0);
      refresh();
    }
  }

  return (
    <FocusCtx.Provider value={{ active, elapsed, refresh, stopping, stop }}>
      {children}
      <FocusPill />
    </FocusCtx.Provider>
  );
}

/** Píldora flotante abajo-derecha visible en todas las secciones con timer. */
function FocusPill() {
  const { active, elapsed, stopping, stop } = useFocus();
  const { t } = useLang();
  const router = useRouter();
  if (!active) return null;
  const color = active.list_color ?? "var(--accent)";

  return (
    <div className="fixed bottom-4 right-4 z-[9000] flex items-center gap-2.5 rounded-2xl glass-dropdown px-3.5 py-2.5 shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
      <button
        type="button"
        onClick={() => router.push("/enfoque/semana")}
        className="flex min-w-0 items-center gap-1.5 cursor-pointer text-left"
        title={active.task_title ?? t.focus?.noTask ?? ""}
      >
        <Timer size={15} className="text-muted shrink-0" />
        <span className="text-sm font-bold tabular-nums">{formatElapsed(elapsed)}</span>
        {active.task_title && (
          <span className="max-w-[140px] truncate text-xs text-muted">{active.task_title}</span>
        )}
      </button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Stop"
        className="h-8 w-8 rounded-xl text-muted hover:text-danger"
        isDisabled={stopping}
        onPress={() => stop()}
      >
        {stopping ? <Spinner size="sm" color="current" /> : <Square size={14} fill="currentColor" />}
      </Button>
    </div>
  );
}
