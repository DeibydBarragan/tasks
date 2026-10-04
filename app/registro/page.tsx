import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider, LanguageToggle } from "@/components/language";
import { getDictionary } from "@/lib/i18n/server";
import { RegisterForm } from "@/components/auth-form";

export default async function RegisterPage() {
  const { lang, t } = await getDictionary();
  return (
    <LanguageProvider lang={lang}>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" translate="no">
            tasks
          </span>
          <span className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle labelLight={t.theme.toLight} labelDark={t.theme.toDark} />
          </span>
        </div>
        <div className="mx-auto mt-14 w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.register.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.register.subtitle}</p>
          <div className="mt-6">
            <RegisterForm />
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            {t.register.hasAccount}{" "}
            <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
              {t.register.signIn}
            </Link>
          </p>
        </div>
      </main>
    </LanguageProvider>
  );
}
