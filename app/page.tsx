import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";

const base =
  "flex w-full items-center justify-center rounded-(--radius) px-4 py-3 text-[15px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/hoy");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="absolute right-4 top-4 flex gap-1">
        <ThemeToggle labelLight="Cambiar a modo claro" labelDark="Cambiar a modo oscuro" />
      </div>
      <div className="w-full max-w-sm text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted" translate="no">
          tasks
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight">
          Tus tareas, en calma y bajo control
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Listas, prioridades, matriz de Eisenhower y racha diaria. Un día a la vez.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/registro" className={`${base} bg-accent text-accent-foreground hover:opacity-90`}>
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className={`${base} border border-border bg-surface text-foreground hover:bg-default`}
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-8 text-xs text-muted">Sin informes complicados. Solo haz y avanza.</p>
      </div>
    </main>
  );
}
