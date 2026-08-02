import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

import { Logo } from "@/components/site/logo";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All Products", to: "/shop" as const },
      { label: "Member Bundles", to: "/shop" as const },
      { label: "New Arrivals", to: "/shop" as const },
    ],
  },
  {
    title: "Membership",
    links: [
      { label: "Become a Member", to: "/membership" as const },
      { label: "Member Pricing", to: "/membership" as const },
      { label: "Login", to: "/login" as const },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our Story", to: "/" as const },
      { label: "Quality Standards", to: "/" as const },
      { label: "Contact", to: "/" as const },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="section-shell py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Premium everyday products at fair, transparent prices — with a membership that pays
              back the people who share it.
            </p>
            <div className="mt-5 flex gap-2">
              {[Facebook, Instagram, Youtube, Linkedin].map((Icon, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft"
                >
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-2xl border border-border bg-card p-6 text-xs leading-relaxed text-muted-foreground shadow-soft md:grid-cols-2">
          <div>
            <p className="font-bold text-foreground">Compliance disclaimer</p>
            <p className="mt-2">
              [Disclaimer placeholder] Statements about KM Prime products have not been evaluated by
              any regulatory authority and are not intended to diagnose, treat, cure, or prevent any
              disease. Membership income examples are illustrative only; earnings depend on
              individual effort and are not guaranteed.
            </p>
          </div>
          <div>
            <p className="font-bold text-foreground">Company address</p>
            <p className="mt-2">
              KM Prime Sdn. Bhd. [Company registration no. placeholder]
              <br />
              [Street address placeholder]
              <br />
              [City, State, Postcode]
              <br />
              [Country]
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KM Prime. All rights reserved.</p>
          <div className="flex gap-5">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
