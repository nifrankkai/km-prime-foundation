import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  IdCard,
  LogOut,
  Network,
  Receipt,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/dashboard", label: "Profile", icon: UserRound, exact: true },
  { to: "/dashboard/membership", label: "Membership Status", icon: ShieldCheck, exact: false },
  { to: "/dashboard/matrix", label: "Matrix Tree", icon: Network, exact: false },
  { to: "/dashboard/performance", label: "PV & Ranks", icon: BarChart3, exact: false },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet, exact: false },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/dashboard/kyc", label: "KYC Verification", icon: IdCard, exact: false },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Member Dashboard — KM Prime" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-6">
            <Logo />
            <nav className="mt-6 flex flex-col gap-1">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "bg-primary-soft text-primary-deep" }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button
              variant="primeGhost"
              className="mt-6 w-full"
              onClick={handleSignOut}
              type="button"
            >
              <LogOut /> Sign out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
