"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Moon, Pencil, Sun, User } from "lucide-react";
import { Button, Card, Input, Label, Spinner, TextField, toast } from "@heroui/react";
import { GlassModal } from "@/components/glass-modal";
import { updateProfile, deleteAccount } from "@/actions/account";
import type { Task, TaskList } from "@/lib/types";
import { toLocalISODate } from "@/lib/dates";

const DELETE_PHRASE = "ELIMINAR";

export function SettingsClient({
  name,
  email,
  lists,
  tasks,
}: {
  name: string | null;
  email: string | null;
  lists: TaskList[];
  tasks: Task[];
}) {
  const [nameOpen, setNameOpen] = useState(false);
  const [delText, setDelText] = useState("");
  const [deleting, startDelete] = useTransition();

  const canDelete = delText.trim().toUpperCase() === DELETE_PHRASE;

  function handleExport() {
    const payload = {
      app: "tasks",
      exportedAt: new Date().toISOString(),
      lists: lists.map(({ id, name, icon, color, position, created_at }) => ({
        id,
        name,
        icon,
        color,
        position,
        created_at,
      })),
      tasks: tasks.map((t) => ({ ...t })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-export-${toLocalISODate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">Ajustes</h1>

      {/* Perfil */}
      <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs">
        <Card.Content className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-xs">
              <User size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{name ?? "—"}</p>
              <p className="truncate text-xs text-muted tabular-nums">{email}</p>
            </div>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Editar nombre"
              className="h-9 w-9 rounded-xl text-muted hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5"
              onPress={() => setNameOpen(true)}
            >
              <Pencil size={15} />
            </Button>
          </div>
        </Card.Content>
      </Card>

      <GlassModal
        isOpen={nameOpen}
        onClose={() => setNameOpen(false)}
        title="Tu perfil"
        icon={<User size={18} className="text-accent" />}
        maxWidth="sm"
      >
        <NameForm key={name ?? ""} current={name ?? ""} onDone={() => setNameOpen(false)} />
      </GlassModal>

      {/* Apariencia */}
      <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs">
        <Card.Content className="p-4 sm:p-5">
          <p className="text-sm font-semibold">Apariencia</p>
          <p className="mt-0.5 text-xs text-muted">Elige entre tema claro u oscuro.</p>
          <ThemePicker />
        </Card.Content>
      </Card>

      {/* Exportación */}
      <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs">
        <Card.Content className="p-4 sm:p-5">
          <p className="text-sm font-semibold">Tus datos</p>
          <p className="mt-0.5 text-xs text-muted">
            Descarga tus {lists.length} listas y {tasks.length} tareas en JSON.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 rounded-xl glass-btn font-semibold"
            onPress={handleExport}
          >
            <Download size={15} className="mr-1.5" />
            Exportar datos
          </Button>
        </Card.Content>
      </Card>

      {/* Zona de peligro */}
      <Card className="rounded-2xl border border-danger/30 bg-danger/5 backdrop-blur-md shadow-xs">
        <Card.Content className="p-5">
          <p className="text-sm font-semibold text-danger">Zona de peligro</p>
          <div className="mt-4 border-t border-danger/20 pt-4">
            <p className="text-sm font-semibold text-foreground">Eliminar cuenta</p>
            <p className="mt-1 text-xs text-muted">
              Se borrarán tu perfil, listas y tareas para siempre. Esta acción no se puede deshacer.
            </p>
            <TextField fullWidth name="del" value={delText} onChange={(v: string) => setDelText(v)} className="mt-3">
              <Label>Escribe {DELETE_PHRASE} para confirmar</Label>
              <Input
                placeholder={DELETE_PHRASE}
                spellCheck={false}
                className="mt-1 rounded-xl bg-surface/50 dark:bg-zinc-900/50 border-border/60"
              />
            </TextField>
            <form
              action={() => {
                startDelete(async () => {
                  const res = await deleteAccount();
                  if (res?.error) toast.danger("No se pudo eliminar la cuenta.");
                });
              }}
              className="mt-3"
            >
              <Button
                variant="danger"
                type="submit"
                className="rounded-xl"
                isDisabled={!canDelete || deleting}
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" color="current" /> Eliminando…
                  </span>
                ) : (
                  "Eliminar mi cuenta"
                )}
              </Button>
            </form>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

function ThemePicker() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setMounted(true);
  }, []);

  function pick(next: "light" | "dark") {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("tasks-theme", next);
    } catch {
      // solo memoria
    }
    setTheme(next);
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Tema">
      {(
        [
          { key: "light", label: "Claro", Icon: Sun },
          { key: "dark", label: "Oscuro", Icon: Moon },
        ] as const
      ).map(({ key, label, Icon }) => {
        const sel = mounted && theme === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={sel}
            onClick={() => pick(key)}
            className={`flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium transition-all cursor-pointer ${
              sel
                ? "border border-accent bg-accent/20 ring-1 ring-accent/30 text-accent font-semibold shadow-xs"
                : "glass-btn text-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function NameForm({ current, onDone }: { current: string; onDone: () => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handle(fd: FormData) {
    startTransition(async () => {
      setError(undefined);
      const res = await updateProfile(fd);
      if (res?.error) {
        setError(res.error === "needName" ? "Escribe tu nombre." : "No se pudo guardar.");
      } else {
        toast.success("Nombre actualizado");
        onDone();
      }
    });
  }

  return (
    <form action={handle} className="flex flex-col gap-4">
      <TextField fullWidth isRequired name="name" defaultValue={current} autoFocus>
        <Label className="text-xs font-semibold">Nombre</Label>
        <Input
          autoComplete="name"
          maxLength={40}
          spellCheck={false}
          className="mt-1 rounded-xl glass-input"
        />
      </TextField>
      {error && (
        <p aria-live="polite" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="pt-2 flex justify-end">
        <Button
          fullWidth
          variant="primary"
          type="submit"
          isDisabled={pending}
          className="rounded-xl shadow-xs font-semibold"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="current" /> Guardando…
            </span>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </form>
  );
}
