"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { useLang } from "@/components/language";

/** Confirmación en popover anclado al botón (estilo glass). */
export function ConfirmPopover({
  trigger,
  message,
  confirmLabel,
  onConfirm,
}: {
  trigger: React.ReactNode;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
        }}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </span>
      {open && (
        <span className="glass-dropdown absolute bottom-full right-0 z-20 mb-2 flex w-52 flex-col gap-2 p-3">
          <span className="text-xs font-medium leading-snug">{message}</span>
          <span className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-7 text-xs"
              onPress={() => setOpen(false)}
            >
              {t.all.no}
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="rounded-lg h-7 text-xs font-semibold"
              isDisabled={pending}
              onPress={async () => {
                setPending(true);
                try {
                  await onConfirm();
                } finally {
                  setPending(false);
                  setOpen(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </span>
        </span>
      )}
    </span>
  );
}
