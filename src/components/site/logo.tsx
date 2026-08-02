import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-transform group-hover:-translate-y-0.5">
        <span className="font-display text-sm font-extrabold tracking-tight">KM</span>
      </span>
      {!compact && (
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
          KM Prime
        </span>
      )}
    </Link>
  );
}
