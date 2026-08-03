import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

import { LicenseBanner } from "@/components/dashboard/license-banner";
import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { supabase } from "@/integrations/supabase/client";
import { listEnabledPaymentMethods, listMyDeposits, submitDeposit } from "@/lib/deposits.functions";
import { getWalletSnapshot } from "@/lib/wallet.functions";
import { money, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const { data: overview } = useMemberOverview();
  const queryClient = useQueryClient();
  const fetchMethods = useServerFn(listEnabledPaymentMethods);
  const fetchDeposits = useServerFn(listMyDeposits);
  const fetchWallet = useServerFn(getWalletSnapshot);
  const submit = useServerFn(submitDeposit);

  const [methodKey, setMethodKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const { data: methods } = useQuery({ queryKey: ["payment-methods"], queryFn: () => fetchMethods() });
  const { data: deposits } = useQuery({ queryKey: ["my-deposits"], queryFn: () => fetchDeposits() });
  const { data: wallet } = useQuery({ queryKey: ["wallet-snapshot"], queryFn: () => fetchWallet() });

  const selected = (methods ?? []).find((m) => m.key === methodKey) ?? methods?.[0] ?? null;

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!selected) throw new Error("Select a payment method.");
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents < 100) throw new Error("Enter an amount of at least $1.00.");

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
      void queryClient.invalidateQueries({ queryKey: ["my-deposits"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <PanelCard
          title="Deposit funds"
          description="Send your payment using one of the methods below, then upload the proof. Your wallet is credited once an admin approves it."
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5">
            <Wallet className="size-5 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current wallet balance
              </p>
              <p className="text-2xl font-extrabold text-primary">{money(wallet?.balanceCents ?? 0)}</p>
            </div>
          </div>

          {(methods ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No deposit methods are currently enabled. Please check back soon.
            </p>
          ) : (
            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate(new FormData(event.currentTarget));
              }}
            >
              <div>
                <Label>Payment method</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {(methods ?? []).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMethodKey(option.key)}
                      className={
                        selected?.key === option.key
                          ? "rounded-xl border-2 border-primary bg-primary-soft/50 p-4 text-left"
                          : "rounded-xl border border-border bg-background p-4 text-left hover:border-primary/40"
                      }
                    >
                      <span className="block text-sm font-bold text-foreground">{option.method_name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selected && (
                <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-deep">
                    Payment instructions
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {selected.instructions_text}
                  </p>
                </div>
              )}

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
                  <Label htmlFor="screenshot">Payment screenshot</Label>
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
          )}
        </PanelCard>

        <PanelCard title="My deposits" description="Track the status of every deposit you have submitted.">
          {(deposits ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No deposits submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {(deposits ?? []).map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
                >
                  <span className="font-bold text-foreground">{money(row.amount_cents)}</span>
                  <span className="text-muted-foreground">{titleCase(row.method_key)}</span>
                  <span
                    className={
                      row.status === "approved"
                        ? "rounded-lg bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-deep"
                        : row.status === "rejected"
                          ? "rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive"
                          : "rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    }
                  >
                    {row.status}
                  </span>
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
        </PanelCard>
      </div>
    </div>
  );
}
