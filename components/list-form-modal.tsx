"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { FolderPlus, ListPlus } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { ColorPicker } from "@/components/color-picker";
import { IconPicker } from "@/components/icon-picker";
import type { TaskList } from "@/lib/types";
import { createList, updateList } from "@/actions/lists";

export function ListFormModal({
  list,
  onDone,
  triggerLabel,
}: {
  list?: TaskList;
  onDone?: () => void;
  triggerLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handle(fd: FormData) {
    startTransition(async () => {
      setError(undefined);
      const res = list ? await updateList(list.id, fd) : await createList(fd);
      if (res?.error) {
        setError(
          res.error === "listExists"
            ? "Ya tienes una lista con ese nombre."
            : res.error === "needName"
              ? "Ponle un nombre a la lista."
              : "No se pudo guardar. Inténtalo de nuevo."
        );
      } else {
        setIsOpen(false);
        onDone?.();
      }
    });
  }

  return (
    <>
      <Button
        variant={list ? "ghost" : "primary"}
        size="sm"
        onPress={() => setIsOpen(true)}
        className={list ? "" : "rounded-xl font-semibold shadow-xs"}
      >
        {!list && <ListPlus size={15} className="mr-1" />}
        {triggerLabel ?? (list ? "Editar" : "Nueva lista")}
      </Button>

      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={list ? "Editar lista" : "Nueva lista"}
        subtitle={list ? list.name : "Agrupa tus tareas por proyecto o contexto"}
        icon={<FolderPlus size={20} />}
      >
        <form action={handle} className="flex flex-col gap-4">
          <TextField fullWidth isRequired name="name" defaultValue={list?.name ?? ""}>
            <Label className="text-xs font-semibold">Nombre</Label>
            <Input
              placeholder="p. ej. Trabajo, Casa, Estudios…"
              spellCheck={false}
              className="mt-1 rounded-xl glass-input"
            />
          </TextField>

          <IconPicker label="Icono" defaultValue={list?.icon ?? "folder"} />
          <ColorPicker label="Color" defaultValue={list?.color ?? "#2563EB"} />

          {error && (
            <p aria-live="polite" className="text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-4 pb-1">
            <Button
              variant="primary"
              type="submit"
              isDisabled={pending}
              className="rounded-xl px-6 shadow-xs font-semibold"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" color="current" /> Guardando…
                </span>
              ) : list ? (
                "Guardar cambios"
              ) : (
                "Crear lista"
              )}
            </Button>
          </div>
        </form>
      </GlassModal>
    </>
  );
}
