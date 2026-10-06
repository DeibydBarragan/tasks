"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { FolderPlus, ListPlus } from "lucide-react";
import { GlassModal } from "@/components/glass-modal";
import { ColorPicker } from "@/components/color-picker";
import { IconPicker } from "@/components/icon-picker";
import { useLang } from "@/components/language";
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
  const { t } = useLang();
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
            ? t.lists.exists
            : res.error === "needName"
              ? t.lists.needName
              : t.lists.saveFail
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
        {triggerLabel ?? (list ? t.lists.edit : t.lists.new)}
      </Button>

      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={list ? t.lists.editTitle : t.lists.newTitle}
        subtitle={list ? list.name : t.lists.newSubtitle}
        icon={<FolderPlus size={20} />}
        footer={
          <button
            type="submit"
            form="list-form"
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {pending && <Spinner size="sm" color="current" />}
            {list ? t.lists.update : t.lists.create}
          </button>
        }
      >
        <form id="list-form" action={handle} className="flex flex-col gap-4 pb-1">
          <TextField fullWidth isRequired name="name" defaultValue={list?.name ?? ""}>
            <Label className="text-xs font-semibold">{t.lists.name}</Label>
            <Input
              placeholder={t.lists.namePh}
              spellCheck={false}
              className="mt-1 rounded-xl glass-input"
            />
          </TextField>

          <IconPicker label={t.lists.icon} defaultValue={list?.icon ?? "folder"} />
          <ColorPicker label={t.lists.color} defaultValue={list?.color ?? "#2563EB"} />

          {error && (
            <p aria-live="polite" className="text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      </GlassModal>
    </>
  );
}
