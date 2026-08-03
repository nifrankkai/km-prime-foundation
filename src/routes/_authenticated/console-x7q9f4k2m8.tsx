import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  BadgeCheck,
  Banknote,
  Boxes,
  Coins,
  Gauge,
  IdCard,
  Mail,
  Megaphone,
  Palette,
  Package,
  Scale,

  Trophy,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/site/logo";
import { useAdminAccess } from "@/hooks/use-admin-access";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8")({
  head: () => ({
    meta: [
      { title: "Admin Console — KM Prime" },
      { name: "description", content: "KM Prime staff console for members, payouts and inventory." },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/console-x7q9f4k2m8", label: "Overview", icon: Gauge, permission: "reports.view", exact: true },
  { to: "/console-x7q9f4k2m8/members", label: "Members", icon: Users, permission: "members.manage", exact: false },
  { to: "/console-x7q9f4k2m8/kyc", label: "KYC queue", icon: IdCard, permission: "kyc.review", exact: false },
  {
    to: "/console-x7q9f4k2m8/withdrawals",
    label: "Withdrawals",
    icon: Wallet,
    permission: "withdrawals.review",
    exact: false,
  },
  {
    to: "/console-x7q9f4k2m8/deposits",
    label: "Pending deposits",
    icon: Banknote,
    permission: "deposits.review",
    exact: false,
  },
  { to: "/console-x7q9f4k2m8/products", label: "Products", icon: Package, permission: "products.manage", exact: false },
  { to: "/console-x7q9f4k2m8/inventory", label: "Stock", icon: Boxes, permission: "stock.manage", exact: false },
  { to: "/console-x7q9f4k2m8/orders", label: "Orders", icon: BadgeCheck, permission: "orders.manage", exact: false },
  {
    to: "/console-x7q9f4k2m8/commissions",
    label: "Commissions",
    icon: Coins,
    permission: "commissions.manage",
    exact: false,
  },
  { to: "/console-x7q9f4k2m8/ranks", label: "Ranks", icon: Trophy, permission: "ranks.manage", exact: false },
  {
    to: "/console-x7q9f4k2m8/content",
    label: "News & gallery",
    icon: Megaphone,
    permission: "announcements.manage",
    exact: false,
  },
  { to: "/console-x7q9f4k2m8/staff", label: "Staff & roles", icon: UserCog, permission: "staff.manage", exact: false },
] as const;


function AdminLayout() {
  const { can, isStaff, isLoading, access } = useAdminAccess();

  if (isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading console…</div>;
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-2xl">Staff access only</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account does not have an administrative role on KM Prime.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm font-semibold text-primary">
          Back to member dashboard
        </Link>
      </div>
    );
  }

  const visible = nav.filter((item) => can(item.permission));

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-6">
            <Logo />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-primary">
              Admin console
            </p>
            <nav className="mt-5 flex flex-col gap-1">
              {visible.map((item) => (
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
              {access?.roles.includes("super_admin") && (
                <>
                  <Link
                    to="/console-x7q9f4k2m8/branding"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeProps={{ className: "bg-primary-soft text-primary-deep" }}
                  >
                    <Palette className="size-4" />
                    Logo & favicon
                  </Link>
                  <Link
                    to="/console-x7q9f4k2m8/legal"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeProps={{ className: "bg-primary-soft text-primary-deep" }}
                  >
                    <Scale className="size-4" />
                    Legal & footer
                  </Link>
                  <Link
                    to="/console-x7q9f4k2m8/mail"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeProps={{ className: "bg-primary-soft text-primary-deep" }}
                  >
                    <Mail className="size-4" />
                    Mail settings
                  </Link>
                  <Link
                    to="/console-x7q9f4k2m8/payment-methods"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeProps={{ className: "bg-primary-soft text-primary-deep" }}
                  >
                    <Banknote className="size-4" />
                    Payment methods
                  </Link>


                </>
              )}
              <Link
                to="/dashboard"
                className="mt-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                ← Member dashboard
              </Link>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
