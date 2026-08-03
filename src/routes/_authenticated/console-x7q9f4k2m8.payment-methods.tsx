import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { adminSetPaymentMethod, listAdminPaymentMethods } from "@/lib/deposit-admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/payment-methods")({
  component: AdminPaymentMethods,
});

type Draft = {
  isEnabled: boolean;
  instructions: string;
  networkLabel: string;
  receivingAddress: string;
  minDeposit: string;
  minWithdrawal: string;
  feePercent: string;
};

function AdminPaymentMethods() {
  const { access } = useAdminAccess();
  const queryClient = useQueryClient();
  const fetchMethods = useServerFn(listAdminPaymentMethods);
  const save = useServerFn(adminSetPaymentMethod);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const { data: methods } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: () => fetchMethods(),
  });

  useEffect(() => {
    if (!methods) return;
    setDrafts(
      Object.fromEntries(
        methods.map((m) => [
          m.key,
          {
            isEnabled: m.is_enabled,
            instructions: m.instructions_text,
            networkLabel: m.network_label ?? "",
            receivingAddress: m.receiving_address ?? "",
            minDeposit: ((m.min_deposit_cents ?? 0) / 100).toFixed(2),
            minWithdrawal: ((m.min_withdrawal_cents ?? 0) / 100).toFixed(2),
            feePercent: String(m.fee_percent ?? 0),
          } satisfies Draft,
        ]),
      ),
    );
  }, [methods]);

  const mutation = useMutation({
    mutationFn: (vars: Parameters<typeof save>[0]) => save(vars),
    onSuccess: () => {
      toast.success("Payment method saved");
      void queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!access?.roles.includes("super_admin")) {
    return (
      <PanelCard title="Payment methods" description="Super Administrator access only.">
        <p className="text-sm text-muted-foreground">
          Only a Super Administrator can change deposit payment methods.
        </p>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Payment methods"
      description="Enable the channels members can deposit and withdraw with, and set the address, limits and fees they see."
    >
      <div className="space-y-4">
        {(methods ?? []).map((method) => {
          const draft = drafts[method.key];
          if (!draft) return null;
          const update = (patch: Partial<Draft>) =>
            setDrafts((prev) => ({ ...prev, [method.key]: { ...draft, ...patch } }));

          return (
            <div key={method.key} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{method.method_name}</p>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`toggle-${method.key}`} className="text-xs text-muted-foreground">
                    {draft.isEnabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch
                    id={`toggle-${method.key}`}
                    checked={draft.isEnabled}
                    onCheckedChange={(checked) => update({ isEnabled: checked })}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Network / label</Label>
                  <Input
                    className="mt-2"
                    value={draft.networkLabel}
                    maxLength={60}
                    placeholder="TRC-20"
                    onChange={(event) => update({ networkLabel: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Receiving address or number</Label>
                  <Input
                    className="mt-2"
                    value={draft.receivingAddress}
                    maxLength={300}
                    placeholder="Wallet address or mobile money number"
                    onChange={(event) => update({ receivingAddress: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Minimum deposit (USD)</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.minDeposit}
                    onChange={(event) => update({ minDeposit: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Minimum withdrawal (USD)</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.minWithdrawal}
                    onChange={(event) => update({ minWithdrawal: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Withdrawal fee (%)</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={draft.feePercent}
                    onChange={(event) => update({ feePercent: event.target.value })}
                  />
                </div>
              </div>

              <Textarea
                className="mt-4 min-h-28"
                value={draft.instructions}
                maxLength={2000}
                placeholder="Step-by-step deposit instructions shown to members"
                onChange={(event) => update({ instructions: event.target.value })}
              />

              <Button
                className="mt-4"
                size="sm"
                variant="prime"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    data: {
                      key: method.key,
                      isEnabled: draft.isEnabled,
                      instructions: draft.instructions,
                      networkLabel: draft.networkLabel,
                      receivingAddress: draft.receivingAddress,
                      minDepositCents: Math.round(Number(draft.minDeposit || 0) * 100),
                      minWithdrawalCents: Math.round(Number(draft.minWithdrawal || 0) * 100),
                      feePercent: Number(draft.feePercent || 0),
                    },
                  })
                }
              >
                Save
              </Button>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
