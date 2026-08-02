import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { getWalletLedger } from "@/lib/membership.functions";
import { getWalletSnapshot, requestWithdrawal } from "@/lib/wallet.functions";

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

const methods = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "usdt", label: "USDT" },
  { value: "manual", label: "Manual payout" },
] as const;

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function WalletPanel() {
  const { data: overview } = useMemberOverview();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof methods)[number]["value"]>("bank_transfer");
  const [destination, setDestination] = useState("");

  const fetchLedger = useServerFn(getWalletLedger);
  const fetchWallet = useServerFn(getWalletSnapshot);
  const submitWithdrawal = useServerFn(requestWithdrawal);

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["wallet-ledger"],
    queryFn: () => fetchLedger(),
  });
  const { data: wallet } = useQuery({ queryKey: ["wallet-snapshot"], queryFn: () => fetchWallet() });

  const mutation = useMutation({
    mutationFn: () =>
      submitWithdrawal({
        data: {
          amountCents: Math.round(Number(amount) * 100),
          method,
          destination: destination.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Withdrawal request submitted for review");
      setAmount("");
      setDestination("");
      void queryClient.invalidateQueries({ queryKey: ["wallet-snapshot"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <PanelCard title="Wallet" description="Approved commissions are credited to your wallet balance.">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Wallet balance" value={money(wallet?.balanceCents ?? 0)} accent />
            <Stat label="Available" value={money(wallet?.availableCents ?? 0)} />
            <Stat label="Pending payouts" value={money(wallet?.pendingCents ?? 0)} />
            <Stat label="Held commission" value={money(overview?.wallet.heldCents ?? 0)} />
          </div>

          {wallet?.frozen && (
            <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Your wallet is currently frozen. Contact support for assistance.
            </p>
          )}
        </PanelCard>

        <PanelCard
          title="Request a withdrawal"
          description="KYC approval is required. Minimum withdrawal is $10.00."
        >
          {!wallet?.kycApproved ? (
            <p className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              Complete and pass KYC verification to unlock withdrawals.
            </p>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const cents = Math.round(Number(amount) * 100);
                if (!Number.isFinite(cents) || cents < 1000) {
                  toast.error("Minimum withdrawal is $10.00");
                  return;
                }
                if (cents > (wallet?.availableCents ?? 0)) {
                  toast.error("Amount exceeds your available balance");
                  return;
                }
                mutation.mutate();
              }}
            >
              <Input
                type="number"
                step="0.01"
                min="10"
                placeholder="Amount (USD)"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
              <select
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={method}
                onChange={(event) => setMethod(event.target.value as typeof method)}
              >
                {methods.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Input
                className="sm:col-span-2"
                placeholder="Destination (account number, wallet address or phone)"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                maxLength={200}
                required
              />
              <Button
                type="submit"
                variant="prime"
                className="sm:w-fit"
                disabled={mutation.isPending || wallet?.frozen}
              >
                Submit request
              </Button>
            </form>
          )}

          {wallet && wallet.withdrawals.length > 0 && (
            <div className="mt-6 space-y-2">
              {wallet.withdrawals.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
                >
                  <span className="font-semibold">{money(row.amount_cents)}</span>
                  <span className="text-muted-foreground">{row.method.replace("_", " ")}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {row.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Transaction history" description="Immutable audit trail of wallet movements.">
          {wallet && wallet.transactions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="p-4 font-semibold text-muted-foreground">Date</th>
                    <th className="p-4 font-semibold text-muted-foreground">Type</th>
                    <th className="p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="p-4 font-semibold text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="p-4 text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-medium">{row.type.replace(/_/g, " ")}</td>
                      <td
                        className={
                          row.amount_cents >= 0 ? "p-4 font-bold text-primary" : "p-4 font-bold text-destructive"
                        }
                      >
                        {money(row.amount_cents)}
                      </td>
                      <td className="p-4 text-muted-foreground">{money(row.balance_after_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet movements yet.</p>
          )}
        </PanelCard>

        <PanelCard title="Commission history" description="Monthly records from the compensation jobs.">
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean | undefined }) {
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
