"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

export type ViewMode = "list" | "chain" | "kanban";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/** Modo de vista Lista ⇄ Flujos con persistencia en localStorage (como habits). */
export function useViewMode(storageKey: string): [ViewMode, (mode: ViewMode) => void] {
  const stored: ViewMode = useSyncExternalStore(
    subscribe,
    (): ViewMode => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        return raw === "chain" ? "chain" : raw === "kanban" ? "kanban" : "list";
      } catch {
        return "list";
      }
    },
    (): ViewMode => "list"
  );
  const [local, setLocal] = useState<ViewMode | null>(null);
  const change = useCallback(
    (mode: ViewMode) => {
      setLocal(mode);
      try {
        window.localStorage.setItem(storageKey, mode);
      } catch {
        // ignore
      }
    },
    [storageKey]
  );
  return [local ?? stored, change];
}
