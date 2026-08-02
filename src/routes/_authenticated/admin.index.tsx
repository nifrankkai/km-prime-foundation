import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PanelCard } from "@/components/dashboard/panel-card";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview;
});

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function AdminOverview() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });

  return (
    <div className="space-y-6">
      <PanelCard title="Platform overview" description="Revenue, membership and payout health.">
        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Paid revenue" value={money(data.revenue_cents)} accent />
            <Stat label="Orders" value={String(data.orders_count)} />
            <Stat label="Active members" value={`${data.active_members} / ${data.total_members}`} />
            <Stat label="Licensed members" value={String(data.licensed_members)} />
            <Stat label="Total PV" value={data.total_pv.toLocaleString()} />
            <Stat label="Commissions paid" value={money(data.commissions_paid_cents)} />
            <Stat label="Commissions held" value={money(data.commissions_held_cents)} />
            <Stat
              label="Awaiting review"
              value={`${data.pending_kyc} KYC · ${data.pending_withdrawals} payouts`}
            />
          </div>
        )}
      </PanelCard>

      <PanelCard title="Revenue by month" description="Last six months of paid orders.">
        {data && data.revenue_by_month.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 font-semibold text-muted-foreground">Month</th>
                  <th className="p-4 font-semibold text-muted-foreground">Orders</th>
                  <th className="p-4 font-semibold text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue_by_month.map((row) => (
                  <tr key={row.month} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{row.month}</td>
                    <td className="p-4 text-muted-foreground">{row.orders}</td>
                    <td className="p-4 font-bold text-primary">{money(row.revenue_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No paid orders recorded yet.</p>
        )}
      </PanelCard>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={accent ? "mt-2 text-2xl font-extrabold text-primary" : "mt-2 text-2xl font-extrabold"}>
        {value}
      </p>
    </div>
  );
}
