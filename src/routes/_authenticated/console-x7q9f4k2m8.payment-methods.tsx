import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { adminSetPaymentMethod, listAdminPaymentMethods } from "@/lib/deposit-admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/payment-methods")({
  component: AdminPaymentMethods,
});

type Draft = { isEnabled: boolean; instructions: string };

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
        methods.map((m) => [m.key, { isEnabled: m.is_enabled, instructions: m.instructions_text }]),
      ),
    );
  }, [methods]);

  const mutation = useMutation({
    mutationFn: (vars: { key: string; isEnabled: boolean; instructions: string }) =>
      save({ data: vars }),
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
      title="Deposit payment methods"
      description="Enable the channels members can deposit with and set the instructions or wallet address they see."
    >
      <div className="space-y-4">
        {(methods ?? []).map((method) => {
          const draft = drafts[method.key] ?? {
            isEnabled: method.is_enabled,
            instructions: method.instructions_text,
          };
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
                    onCheckedChange={(checked) =>
                      setDrafts((prev) => ({ ...prev, [method.key]: { ...draft, isEnabled: checked } }))
                    }
                  />
                </div>
              </div>

              <Textarea
                className="mt-4 min-h-28"
                value={draft.instructions}
                maxLength={2000}
                placeholder="Wallet address, mobile money number or step-by-step instructions"
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [method.key]: { ...draft, instructions: event.target.value },
                  }))
                }
              />

              <Button
                className="mt-4"
                size="sm"
                variant="prime"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    key: method.key,
                    isEnabled: draft.isEnabled,
                    instructions: draft.instructions,
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
