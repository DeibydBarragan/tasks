"use client";

import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
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

  const triggerEl = isValidElement<{ onPress?: () => void }>(trigger)
    ? cloneElement(trigger, { onPress: () => setOpen((v) => !v) })
    : trigger;

  return (
    <span ref={ref} className="relative inline-flex">
      {triggerEl}
      {open && (
        <span className="glass-modal-enter absolute bottom-full right-0 z-20 mb-2 flex w-56 flex-col gap-2.5 rounded-2xl border border-white/25 dark:border-white/15 bg-white/55 dark:bg-[#161820]/60 p-3.5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl saturate-150">
          <span className="text-xs font-medium leading-snug">{message}</span>
          <span className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-7 text-xs"
              isDisabled={pending}
              onPress={() => setOpen(false)}
            >
              {t.all.no}
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="rounded-lg h-7 text-xs font-semibold min-w-20"
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
              {pending ? (
                <span className="flex items-center gap-1.5">
                  <Spinner size="sm" color="current" />
                  <span>{confirmLabel}…</span>
                </span>
              ) : (
                confirmLabel
              )}
            </Button>
          </span>
        </span>
      )}
    </span>
  );
}
