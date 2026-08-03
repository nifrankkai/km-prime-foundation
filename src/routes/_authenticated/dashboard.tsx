import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  IdCard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Network,
  Receipt,
  ShoppingBag,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/use-admin-access";

const items = [
  { to: "/dashboard", label: "Profile", icon: UserRound, exact: true },
  { to: "/dashboard/membership", label: "Membership Status", icon: ShieldCheck, exact: false },
  { to: "/dashboard/matrix", label: "Matrix Tree", icon: Network, exact: false },
  { to: "/dashboard/performance", label: "PV & Ranks", icon: BarChart3, exact: false },
  { to: "/dashboard/shop", label: "Shop", icon: ShoppingBag, exact: false },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet, exact: false },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/dashboard/kyc", label: "KYC Verification", icon: IdCard, exact: false },
  { to: "/dashboard/support", label: "Support", icon: LifeBuoy, exact: false },
  { to: "/dashboard/news", label: "Company News", icon: Megaphone, exact: false },
] as const;


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Member Dashboard — KM Prime" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isStaff } = useAdminAccess();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="app-dark network-bg min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-6 md:px-5 md:pb-10 lg:flex-row">
        <aside className="hidden md:block lg:w-64 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-soft backdrop-blur lg:sticky lg:top-6">
            <Logo />
            <nav className="mt-6 flex flex-col gap-1 lg:flex-col">
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
            {isStaff && (
              <Link
                to="/console-x7q9f4k2m8"
                className="mt-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft px-3 py-2.5 text-sm font-semibold text-primary-deep"
              >
                <ShieldCheck className="size-4" /> Admin console
              </Link>
            )}
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

        <main className="min-w-0 flex-1 animate-fade-in">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              {isStaff && (
                <Link
                  to="/console-x7q9f4k2m8"
                  aria-label="Admin console"
                  className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary-soft text-primary-deep"
                >
                  <ShieldCheck className="size-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
