import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { RegisterForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" translate="no">
          tasks
        </span>
        <ThemeToggle labelLight="Cambiar a modo claro" labelDark="Cambiar a modo oscuro" />
      </div>
      <div className="mx-auto mt-14 w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">Empieza a organizar tus tareas en segundos.</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
