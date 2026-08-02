import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PanelCard } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { getWalletLedger } from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  component: WalletPanel,
});

const typeLabels: Record<string, string> = {
  matrix: "Matrix commission",
  direct_referral: "Direct Referral Bonus",
  matching: "Matching Bonus",
  product: "Product Bonus",
  leadership: "Leadership Bonus",
  rank: "Rank Bonus",
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function WalletPanel() {
  const { data: overview } = useMemberOverview();
  const fetchLedger = useServerFn(getWalletLedger);
  const { data: ledger, isLoading } = useQuery({
    queryKey: ["wallet-ledger"],
    queryFn: () => fetchLedger(),
  });

  return (
    <>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <PanelCard
          title="Wallet"
          description="Balances are produced by the monthly matrix commission job."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Available balance" value={money(overview?.wallet.paidCents ?? 0)} accent />
            <Stat label="Held (unqualified)" value={money(overview?.wallet.heldCents ?? 0)} />
            <Stat label="Active directs" value={`${overview?.activeDirects ?? 0} of 2 required`} />
          </div>

          {!overview?.qualified && (
            <p className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              Commission is calculated but held until you have an active account, a current monthly
              licence payment, at least 2 personally sponsored active affiliates and your rank
              qualification.
            </p>
          )}
        </PanelCard>

        <PanelCard title="Commission history" description="Monthly records from the matrix job.">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : ledger && ledger.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="p-4 font-semibold text-muted-foreground">Period</th>
                    <th className="p-4 font-semibold text-muted-foreground">Type</th>
                    <th className="p-4 font-semibold text-muted-foreground">Volume</th>
                    <th className="p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="p-4 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="p-4 text-muted-foreground">
                        {new Date(row.period_month).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 font-medium">{typeLabels[row.type] ?? row.type}</td>
                      <td className="p-4 text-muted-foreground">{row.volume}</td>
                      <td className="p-4 font-bold text-primary">{money(row.amount_cents)}</td>
                      <td className="p-4">
                        <span
                          className={
                            row.status === "paid"
                              ? "rounded-lg bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-deep"
                              : "rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                          }
                        >
                          {row.status === "paid" ? "Paid" : "Held"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No commission records yet — the job runs on the 1st of each month.
            </p>
          )}
        </PanelCard>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          accent
            ? "mt-2 text-2xl font-extrabold text-primary"
            : "mt-2 text-2xl font-extrabold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
