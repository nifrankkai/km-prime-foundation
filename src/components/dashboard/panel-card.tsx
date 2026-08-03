import type { ReactNode } from "react";

export function PanelCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur sm:p-7">
      <h1 className="text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}

export function PlaceholderGrid({ rows }: { rows: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row}
          className="rounded-xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground"
        >
          {row}
        </div>
      ))}
    </div>
  );
}
