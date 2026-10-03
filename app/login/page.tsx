import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/auth-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" translate="no">
          tasks
        </span>
        <ThemeToggle labelLight="Cambiar a modo claro" labelDark="Cambiar a modo oscuro" />
      </div>
      <div className="mx-auto mt-14 w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Bienvenido de nuevo</h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión para ver tus tareas de hoy.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-accent underline-offset-4 hover:underline">
            Crea una
          </Link>
        </p>
      </div>
    </main>
  );
}
