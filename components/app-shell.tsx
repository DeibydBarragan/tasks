"use client";

import { AppNav } from "@/components/app-nav";
import { MotionProvider } from "@/components/animated";
import { signOut } from "@/actions/auth";
import type { Streak } from "@/lib/types";

export function AppShell({
  name,
  streak,
  children,
  className,
}: {
  name?: string | null;
  streak: Streak;
  children: React.ReactNode;
  className?: string;
}) {
  const containerClass = className ?? "max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1536px]";
  return (
    <MotionProvider>
      <AppNav name={name} streak={streak} onSignOut={() => signOut()} containerClass={containerClass} />
      <main
        id="main-content"
        className={`mx-auto flex w-full flex-col gap-5 px-4 sm:px-6 py-6 transition-all duration-300 ${containerClass}`}
      >
        {children}
      </main>
    </MotionProvider>
  );
}
