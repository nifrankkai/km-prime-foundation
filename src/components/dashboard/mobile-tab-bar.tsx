import { Link } from "@tanstack/react-router";
import { Home, Network, ShoppingBag, UserRound, Wallet } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home, exact: true },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet, exact: false },
  { to: "/dashboard/matrix", label: "Team", icon: Network, exact: false },
  { to: "/dashboard/shop", label: "Shop", icon: ShoppingBag, exact: false },
  { to: "/dashboard/membership", label: "Profile", icon: UserRound, exact: false },
] as const;

export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              activeOptions={{ exact: tab.exact }}
              className="flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <tab.icon className="size-5" aria-hidden />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
