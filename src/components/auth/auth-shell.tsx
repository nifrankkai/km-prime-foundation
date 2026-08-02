import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/site/logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-secondary/40 px-5 py-12">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-primary-soft/70 blur-3xl" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-lift">
          <h1 className="text-2xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
        <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
            ← Back to KM Prime
          </Link>
        </div>
      </div>
    </div>
  );
}
