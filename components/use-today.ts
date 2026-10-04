"use client";

import { useEffect, useState } from "react";
import { toLocalISODate } from "@/lib/dates";

/**
 * Fecha "hoy" única para todo el cliente: parte del valor del servidor
 * (primer pintado sin parpadeo) y se corrige al montar si el dispositivo
 * dice otro día (pestaña abierta al cruzar medianoche o desfase horario).
 * Así filtros y etiquetas (Hoy/Mañana/Ayer) nunca se desincronizan.
 */
export function useToday(serverToday: string): string {
  const [today, setToday] = useState(serverToday);

  useEffect(() => {
    const deviceToday = toLocalISODate();
    if (deviceToday !== serverToday) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToday(deviceToday);
    }
  }, [serverToday]);

  return today;
}
