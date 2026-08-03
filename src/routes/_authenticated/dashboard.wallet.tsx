import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownLeft, ArrowUpRight, Copy, Lock, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { CountUp } from "@/components/dashboard/count-up";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { supabase } from "@/integrations/supabase/client";
import { listEnabledPaymentMethods, listMyDeposits, submitDeposit } from "@/lib/deposits.functions";
import {
  getWalletSnapshot,
  requestWithdrawal,
  setWithdrawalPin,
  type WalletSnapshot,
} from "@/lib/wallet.functions";
import { money, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  component: WalletPage,
});

const TABS = [
  { key: "deposit", label: "Deposit" },
  { key: "deposit-history", label: "Deposit history" },
  { key: "withdraw", label: "Withdraw" },
  { key: "withdraw-history", label: "Withdraw history" },
  { key: "transactions", label: "Transactions" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function WalletPage() {
  const { data: overview } = useMemberOverview();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("deposit");

  const fetchWallet = useServerFn(getWalletSnapshot);
  const fetchMethods = useServerFn(listEnabledPaymentMethods);
  const fetchDeposits = useServerFn(listMyDeposits);

  const { data: wallet } = useQuery({ queryKey: ["wallet-snapshot"], queryFn: () => fetchWallet() });
  const { data: methods } = useQuery({ queryKey: ["payment-methods"], queryFn: () => fetchMethods() });
  const { data: deposits } = useQuery({ queryKey: ["my-deposits"], queryFn: () => fetchDeposits() });

  const refreshWallet = () => {
    void queryClient.invalidateQueries({ queryKey: ["wallet-snapshot"] });
    void queryClient.invalidateQueries({ queryKey: ["my-deposits"] });
  };

  return (
    <div>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <header className="rounded-3xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl">Wallet</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Fund your account, request payouts and review every movement in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary-soft/50 px-6 py-4">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary-deep">
                <WalletIcon className="size-3.5" /> Total balance
              </p>
              <p className="figure-num mt-1 text-3xl text-primary">
                <CountUp
                  value={(wallet?.balanceCents ?? 0) / 100}
                  format={(n) => `$${n.toFixed(2)}`}
                />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Available {money(wallet?.availableCents ?? 0)} · Pending{" "}
                {money(wallet?.pendingCents ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={
                  tab === item.key
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {wallet?.frozen && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Your wallet is currently frozen. Open a support ticket for assistance.
          </p>
        )}

        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur sm:p-7">
          {tab === "deposit" && (
            <DepositTab methods={methods ?? []} onDone={refreshWallet} />
          )}
          {tab === "deposit-history" && <DepositHistory rows={deposits ?? []} />}
          {tab === "withdraw" && (
            <WithdrawTab wallet={wallet} methods={methods ?? []} onDone={refreshWallet} />
          )}
          {tab === "withdraw-history" && <WithdrawHistory wallet={wallet} />}
          {tab === "transactions" && <TransactionsTab wallet={wallet} />}
        </section>
      </div>
    </div>
  );
}

type MethodRow = Awaited<ReturnType<typeof listEnabledPaymentMethods>>[number];

function MethodToggle({
  methods,
  value,
  onChange,
}: {
  methods: MethodRow[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-border bg-secondary/50 p-1">
      {methods.map((method) => (
        <button
          key={method.key}
          type="button"
          onClick={() => onChange(method.key)}
          className={
            value === method.key
              ? "rounded-full bg-card px-4 py-2 text-sm font-semibold text-primary-deep shadow-soft"
              : "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground"
          }
        >
          {method.method_name}
        </button>
      ))}
    </div>
  );
}

function DepositTab({ methods, onDone }: { methods: MethodRow[]; onDone: () => void }) {
  const submit = useServerFn(submitDeposit);
  const [methodKey, setMethodKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const selected = methods.find((m) => m.key === methodKey) ?? methods[0] ?? null;

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!selected) throw new Error("Select a payment method.");
      const cents = Math.round(Number(amount) * 100);
      const min = selected.min_deposit_cents || 100;
      if (!Number.isFinite(cents) || cents < min) {
        throw new Error(`Minimum deposit for this method is ${money(min)}.`);
      }

      const file = form.get("screenshot") as File | null;
      if (!file?.size) throw new Error("Upload a screenshot of your payment.");
      if (file.size > 5_000_000) throw new Error("Screenshot must be under 5MB.");

      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("You must be signed in.");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/deposit-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("deposit-proofs")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);

      return submit({ data: { methodKey: selected.key, amountCents: cents, screenshotPath: path } });
    },
    onSuccess: () => {
      toast.success("Deposit submitted — an admin will review it shortly.");
      setAmount("");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (methods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No deposit methods are currently enabled. Please check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Deposit funds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send your payment to the address below, then upload the proof. Your wallet is credited
          once an administrator approves it.
        </p>
      </div>

      <MethodToggle methods={methods} value={selected?.key ?? null} onChange={setMethodKey} />

      {selected && (
        <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-deep">
            {selected.method_name}
            {selected.network_label ? ` · ${selected.network_label}` : ""}
          </p>
          {selected.receiving_address && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="break-all rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold">
                {selected.receiving_address}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(selected.receiving_address);
                  toast.success("Address copied");
                }}
              >
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>
          )}
          {selected.instructions_text && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
              {selected.instructions_text}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Minimum deposit {money(selected.min_deposit_cents || 100)}.
          </p>
        </div>
      )}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="amount">Amount sent (USD)</Label>
            <Input
              id="amount"
              className="mt-2"
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="screenshot">Payment proof</Label>
            <Input
              id="screenshot"
              name="screenshot"
              className="mt-2"
              type="file"
              accept="image/*"
              required
            />
          </div>
        </div>

        <Button type="submit" variant="prime" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting…" : "Submit deposit for review"}
        </Button>
      </form>
    </div>
  );
}

function DepositHistory({ rows }: { rows: Awaited<ReturnType<typeof listMyDeposits>> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Deposit history</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deposits submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
            >
              <span className="flex items-center gap-2 font-bold text-foreground">
                <ArrowDownLeft className="size-4 text-primary" />
                {money(row.amount_cents)}
              </span>
              <span className="text-muted-foreground">{titleCase(row.method_key)}</span>
              <StatusPill status={row.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(row.submitted_at).toLocaleString()}
              </span>
              {row.admin_note && (
                <span className="w-full text-xs text-muted-foreground">Note: {row.admin_note}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawTab({
  wallet,
  methods,
  onDone,
}: {
  wallet: WalletSnapshot | undefined;
  methods: MethodRow[];
  onDone: () => void;
}) {
  const savePin = useServerFn(setWithdrawalPin);
  const submit = useServerFn(requestWithdrawal);
  const queryClient = useQueryClient();

  const [methodKey, setMethodKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [touchedDestination, setTouchedDestination] = useState(false);

  const selected = methods.find((m) => m.key === methodKey) ?? methods[0] ?? null;

  const prefill =
    selected?.key === "usdt"
      ? (wallet?.usdtAddress ?? "")
      : selected?.key === "mobile_money"
        ? (wallet?.mobileMoneyNumber ?? "")
        : "";
  const destinationValue = touchedDestination ? destination : prefill;

  const cents = Math.round(Number(amount || 0) * 100);
  const feePercent = Number(selected?.fee_percent ?? 0);
  const fee = useMemo(() => Math.round((cents * feePercent) / 100), [cents, feePercent]);
  const net = Math.max(0, cents - fee);
  const minCents = selected?.min_withdrawal_cents || 1000;

  const pinMutation = useMutation({
    mutationFn: () => savePin({ data: { pin: newPin } }),
    onSuccess: () => {
      toast.success("Withdrawal PIN set. Keep it safe — only an admin can reset it.");
      setNewPin("");
      setConfirmPin("");
      void queryClient.invalidateQueries({ queryKey: ["wallet-snapshot"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          amountCents: cents,
          method: selected!.key as "usdt" | "mobile_money" | "bank_transfer" | "manual",
          destination: destinationValue.trim(),
          pin,
          saveDestination: true,
        },
      }),
    onSuccess: () => {
      toast.success("Withdrawal request submitted for review");
      setAmount("");
      setPin("");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!wallet?.kycApproved) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Withdraw</h2>
        <p className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Complete and pass KYC verification to unlock withdrawals.
        </p>
      </div>
    );
  }

  if (!wallet.hasPin) {
    return (
      <div className="max-w-md space-y-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Lock className="size-4 text-primary" /> Set your withdrawal PIN
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A 4-digit PIN protects every payout. You cannot change it later — a reset must be
            requested through a support ticket.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="new-pin">New 4-digit PIN</Label>
            <Input
              id="new-pin"
              className="mt-2 tracking-[0.5em]"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="confirm-pin">Confirm PIN</Label>
            <Input
              id="confirm-pin"
              className="mt-2 tracking-[0.5em]"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        <ConfirmDialog
          trigger={
            <Button variant="prime" disabled={newPin.length !== 4 || newPin !== confirmPin}>
              Set PIN
            </Button>
          }
          title="Set your withdrawal PIN?"
          description="This PIN is permanent. You will need a support ticket to have an administrator reset it."
          confirmLabel="Set PIN"
          pending={pinMutation.isPending}
          onConfirm={() => pinMutation.mutate()}
        />
      </div>
    );
  }

  function validate(): boolean {
    if (!selected) {
      toast.error("Select a payout method.");
      return false;
    }
    if (cents < minCents) {
      toast.error(`Minimum withdrawal is ${money(minCents)}.`);
      return false;
    }
    if (cents > wallet!.availableCents) {
      toast.error("Amount exceeds available balance.");
      return false;
    }
    if (destinationValue.trim().length < 4) {
      toast.error("Enter a payout destination.");
      return false;
    }
    if (pin.length !== 4) {
      toast.error("Enter your 4-digit PIN.");
      return false;
    }
    return true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Withdraw</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Available to withdraw: <strong>{money(wallet.availableCents)}</strong>
        </p>
      </div>

      <MethodToggle methods={methods} value={selected?.key ?? null} onChange={(key) => {
        setMethodKey(key);
        setTouchedDestination(false);
      }} />

      <form
        className="grid max-w-2xl gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (validate()) mutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="w-amount">Amount (USD)</Label>
          <Input
            id="w-amount"
            className="mt-2"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="w-pin">Withdrawal PIN</Label>
          <Input
            id="w-pin"
            className="mt-2 tracking-[0.5em]"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="w-dest">
            Destination {selected?.network_label ? `(${selected.network_label})` : ""}
          </Label>
          <Input
            id="w-dest"
            className="mt-2"
            value={destinationValue}
            maxLength={200}
            placeholder="Wallet address, phone number or account details"
            onChange={(event) => {
              setTouchedDestination(true);
              setDestination(event.target.value);
            }}
            required
          />
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-5 text-sm sm:col-span-2">
          <SummaryRow label="Requested" value={money(cents)} />
          <SummaryRow label={`Processing fee (${feePercent}%)`} value={`− ${money(fee)}`} />
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold">You receive</span>
            <span className="text-lg font-extrabold text-primary">{money(net)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Minimum {money(minCents)} · requests are reviewed manually by an administrator.
          </p>
        </div>

        <div className="sm:col-span-2">
          <ConfirmDialog
            trigger={
              <Button type="button" variant="prime" disabled={mutation.isPending || wallet.frozen}>
                Request withdrawal
              </Button>
            }
            title="Submit this withdrawal request?"
            description={`You are requesting ${money(cents)} via ${selected?.method_name ?? "—"}. After a ${money(fee)} fee you will receive ${money(net)} at ${destinationValue || "—"}.`}
            confirmLabel="Confirm request"
            pending={mutation.isPending}
            onConfirm={() => {
              if (validate()) mutation.mutate();
            }}
          />
        </div>
      </form>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Forgot your PIN? Open a support ticket and an administrator will reset it.
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function WithdrawHistory({ wallet }: { wallet: WalletSnapshot | undefined }) {
  const rows = wallet?.withdrawals ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Withdraw history</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-bold text-foreground">
                  <ArrowUpRight className="size-4 text-destructive" />
                  {money(row.amount_cents)}
                </span>
                <span className="text-muted-foreground">{titleCase(row.method)}</span>
                <StatusPill status={row.status} />
                <span className="text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                To {row.destination} · fee {money(row.fee_cents)} · net {money(row.net_cents)}
              </p>
              {row.admin_note && (
                <p className="mt-1 text-xs text-muted-foreground">Note: {row.admin_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsTab({ wallet }: { wallet: WalletSnapshot | undefined }) {
  const rows = wallet?.transactions ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Transactions</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wallet movements yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="p-4 font-semibold text-muted-foreground">Date</th>
                <th className="p-4 font-semibold text-muted-foreground">Type</th>
                <th className="p-4 font-semibold text-muted-foreground">Note</th>
                <th className="p-4 font-semibold text-muted-foreground">Amount</th>
                <th className="p-4 font-semibold text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="p-4 text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 font-medium">{titleCase(row.type)}</td>
                  <td className="p-4 text-muted-foreground">{row.note ?? "—"}</td>
                  <td
                    className={
                      row.amount_cents >= 0
                        ? "p-4 font-bold text-primary"
                        : "p-4 font-bold text-destructive"
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
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "approved" || status === "paid"
      ? "bg-primary-soft text-primary-deep"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tone}`}>
      {status}
    </span>
  );
}
