import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgePercent, Check, HandCoins, LayoutDashboard, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

const title = "Become a Member — KM Prime";
const description =
  "Register for KM Prime membership for member pricing, a personal dashboard, and referral rewards on real orders.";

const perks = [
  { icon: BadgePercent, label: "Member pricing on every product" },
  { icon: HandCoins, label: "Referral rewards on qualified orders" },
  { icon: LayoutDashboard, label: "Personal dashboard for orders and wallet" },
  { icon: Users, label: "Referral network view as it grows" },
];

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="section-shell grid items-start gap-12 py-16 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Membership</span>
            <h1 className="mt-5 text-4xl sm:text-5xl">Join once. Pay the member price forever.</h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Registration is free. New accounts start with a Pending status while we verify
              details, then activate for member pricing and rewards.
            </p>
            <ul className="mt-8 space-y-3">
              {perks.map((perk) => (
                <li key={perk.label} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-deep">
                    <perk.icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{perk.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="prime" size="xl">
                <Link to="/register">Create my account</Link>
              </Button>
              <Button asChild variant="primeGhost" size="xl">
                <Link to="/login">I already have one</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8 shadow-lift">
            <h2 className="text-2xl">Member vs. guest</h2>
            <div className="mt-6 space-y-4">
              {[
                { label: "Prime Starter Set", retail: "RM 520", member: "RM 349" },
                { label: "Radiance Collagen Blend", retail: "RM 249", member: "RM 174" },
                { label: "Daily Defense Capsules", retail: "RM 189", member: "RM 132" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                >
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  <span className="flex items-baseline gap-3">
                    <span className="text-sm text-muted-foreground line-through">{row.retail}</span>
                    <span className="text-base font-extrabold text-primary">{row.member}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Prices are illustrative for this phase. Live pricing follows in the store build.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
