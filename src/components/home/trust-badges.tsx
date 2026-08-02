import { BadgeCheck, PackageCheck, ShieldCheck, Truck } from "lucide-react";

const badges = [
  { icon: BadgeCheck, label: "Lab-verified batches" },
  { icon: ShieldCheck, label: "30-day money back" },
  { icon: Truck, label: "Free delivery over RM 150" },
  { icon: PackageCheck, label: "Sealed, traceable packaging" },
];

export function TrustBadges() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="section-shell grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge) => (
          <div key={badge.label} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-deep">
              <badge.icon className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">{badge.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
