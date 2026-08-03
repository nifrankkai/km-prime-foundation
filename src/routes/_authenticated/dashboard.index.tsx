import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, ArrowUpFromLine, ShoppingBag, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { CountUp } from "@/components/dashboard/count-up";
import { Badge } from "@/components/ui/badge";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { getPerformance, listRanks } from "@/lib/compensation.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { data: overview } = useMemberOverview();
  const fetchPerformance = useServerFn(getPerformance);
  const fetchRanks = useServerFn(listRanks);

  const { data: performance } = useQuery({
    queryKey: ["performance"],
    queryFn: () => fetchPerformance(),
  });
  const { data: ranks } = useQuery({ queryKey: ["ranks"], queryFn: () => fetchRanks() });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, email")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const [{ data: commissions }, { data: orders }] = await Promise.all([
        supabase
          .from("commissions")
          .select("id, amount_cents, type, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select("id, total_cents, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const rows = [
        ...(commissions ?? []).map((c) => ({
          id: `c-${c.id}`,
          title: `Commission — ${String(c.type ?? "matrix").replace(/_/g, " ")}`,
          amount: c.amount_cents ?? 0,
          at: c.created_at as string,
          positive: true,
        })),
        ...(orders ?? []).map((o) => ({
          id: `o-${o.id}`,
          title: `Order ${String(o.status ?? "").replace(/_/g, " ")}`,
          amount: -(o.total_cents ?? 0),
          at: o.created_at as string,
          positive: false,
        })),
      ];
      return rows.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile…</div>;
  }

  const ladder = ranks ?? [];
  const currentLevel = ladder.find((r) => r.key === overview?.rank.key)?.level ?? 0;
  const nextRank = ladder.find((r) => r.level > currentLevel);
  const groupPv = performance?.groupPv ?? 0;
  const target = nextRank?.minGroupPv ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((groupPv / target) * 100)) : 100;
  const balance = (overview?.wallet.paidCents ?? 0) / 100;

  return (
    <div className="space-y-6">
      <LicenseBanner overview={overview} />

      {/* Growth hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur sm:p-8">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-1 truncate text-2xl sm:text-3xl">{profile?.full_name ?? "Member"}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="animate-rank-pulse rounded-lg border-reward/50 bg-reward-soft text-[10px] font-bold uppercase tracking-wider text-reward"
              >
                {overview?.rank.name ?? "Member"}
              </Badge>
              <span className="text-xs text-muted-foreground">@{profile?.username}</span>
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Wallet balance
            </p>
            <p className="figure-num mt-1 text-4xl text-primary sm:text-5xl">
              <CountUp value={balance} format={(n) => `$${n.toFixed(2)}`} />
            </p>
          </div>

          <RadialProgress pct={pct} label={nextRank ? nextRank.name : "Top rank"} />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Group PV" value={groupPv} />
          <MiniStat label="Personal PV" value={performance?.personalPv ?? 0} />
          <MiniStat label="Active directs" value={overview?.activeDirects ?? 0} />
          <MiniStat label="Matrix volume" value={overview?.matrixVolume ?? 0} />
        </div>
      </section>

      {/* Quick actions */}
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        <QuickAction to="/dashboard/wallet" icon={ArrowDownToLine} label="Deposit" />
        <QuickAction to="/dashboard/wallet" icon={ArrowUpFromLine} label="Withdraw" />
        <QuickAction to="/dashboard/matrix" icon={Users} label="Refer" />
        <QuickAction to="/dashboard/shop" icon={ShoppingBag} label="Shop" />
      </div>

      {/* Recent activity */}
      <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur">
        <h2 className="text-lg">Recent activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Commissions, orders and referral rewards from your network.
        </p>
        <ul className="mt-5 divide-y divide-border">
          {(activity ?? []).length === 0 && (
            <li className="py-6 text-sm text-muted-foreground">No activity yet.</li>
          )}
          {(activity ?? []).map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize text-foreground">
                  {row.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={
                  row.positive
                    ? "figure-num shrink-0 text-sm text-primary"
                    : "figure-num shrink-0 text-sm text-foreground"
                }
              >
                {row.positive ? "+" : "−"}${(Math.abs(row.amount) / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RadialProgress({ pct, label }: { pct: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative size-32">
        <svg viewBox="0 0 128 128" className="size-32 -rotate-90">
          <circle cx="64" cy="64" r={r} className="fill-none stroke-border" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={r}
            className="fill-none stroke-primary transition-[stroke-dashoffset] duration-700"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="figure-num text-2xl text-foreground">{pct}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        to <span className="font-semibold text-foreground">{label}</span>
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="figure-num mt-1.5 text-xl text-foreground">
        <CountUp value={value} />
      </p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof ShoppingBag;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-w-[6.5rem] snap-start flex-col items-center gap-2 rounded-2xl border border-border bg-card/80 px-5 py-4 text-sm font-medium text-foreground shadow-soft backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
    >
      <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary-deep">
        <Icon className="size-5" />
      </span>
      {label}
    </Link>
  );
}
