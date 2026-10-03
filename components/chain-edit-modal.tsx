"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { Clock, Workflow } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { updateChainMetadata } from "@/actions/tasks";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  headTaskId: string;
  initialName?: string | null;
  initialTime?: string | null;
  onSuccess?: () => void;
};

/** Configura nombre y hora de la cadena (se guardan en la tarea cabeza). */
export function ChainEditModal({
  isOpen,
  onClose,
  headTaskId,
  initialName = "",
  initialTime = null,
  onSuccess,
}: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [time, setTime] = useState(initialTime ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (!isOpen) return null;

  function handleSave() {
    startTransition(async () => {
      setError(undefined);
      const res = await updateChainMetadata(headTaskId, name.trim() || null, time.trim() || null);
      if (res?.error) {
        setError("No se pudo guardar. Inténtalo de nuevo.");
      } else {
        onSuccess?.();
        onClose();
      }
    });
  }

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar flujo"
      subtitle="Nombre y hora de esta cadena de tareas"
      icon={<Workflow size={18} className="text-accent" />}
      maxWidth="md"
      footer={
        <>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl font-medium glass-btn"
            onPress={onClose}
            isDisabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="rounded-xl font-semibold px-4 shadow-xs"
            onPress={handleSave}
            isDisabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" color="current" />
                <span>Guardando…</span>
              </span>
            ) : (
              "Guardar flujo"
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField fullWidth name="chainName">
          <Label className="text-xs font-semibold">Nombre del flujo</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Rutina de mañana, Cierre semanal…"
            spellCheck={false}
            autoFocus
            className="mt-1 rounded-xl glass-input"
          />
        </TextField>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="chain-time" className="text-xs font-semibold flex items-center gap-1.5">
            <Clock size={13} className="text-muted" />
            Hora del flujo (opcional)
          </label>
          <input
            id="chain-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm text-foreground outline-none tabular-nums"
          />
          <span className="text-xs text-muted">Vacío = a cualquier hora.</span>
        </div>

        {error && (
          <p aria-live="polite" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </GlassModal>
  );
}
