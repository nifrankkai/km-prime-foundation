import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { adminSetCommissionStatus, listAdminCommissions } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/commissions")({
  component: AdminCommissions,
});

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function AdminCommissions() {
  const queryClient = useQueryClient();
  const fetchCommissions = useServerFn(listAdminCommissions);
  const setStatus = useServerFn(adminSetCommissionStatus);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: () => fetchCommissions(),
  });

  const mutation = useMutation({
    mutationFn: (vars: {
      id: string;
      status: "paid" | "held";
      amountCents: number | null;
      note: string | null;
    }) => setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Commission updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard
      title="Commission oversight"
      description="Preview calculated payouts and override before they are credited to wallets."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading commissions…</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-4 font-semibold text-muted-foreground">Member</th>
              <th className="p-4 font-semibold text-muted-foreground">Period</th>
              <th className="p-4 font-semibold text-muted-foreground">Type</th>
              <th className="p-4 font-semibold text-muted-foreground">Amount</th>
              <th className="p-4 font-semibold text-muted-foreground">Status</th>
              <th className="p-4 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="p-4 font-medium">{row.fullName}</td>
                <td className="p-4 text-muted-foreground">
                  {new Date(row.period_month).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="p-4 text-muted-foreground">{row.type}</td>
                <td className="p-4 font-bold text-primary">{money(row.amount_cents)}</td>
                <td className="p-4 text-xs uppercase tracking-wider text-muted-foreground">
                  {row.credited_at ? "credited" : row.status}
                </td>
                <td className="p-4">
                  {row.credited_at ? (
                    <span className="text-xs text-muted-foreground">Locked</span>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mutation.mutate({
                            id: row.id,
                            status: row.status === "paid" ? "held" : "paid",
                            amountCents: null,
                            note: null,
                          })
                        }
                      >
                        {row.status === "paid" ? "Hold" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const raw = window.prompt(
                            "Override amount in USD",
                            (row.amount_cents / 100).toFixed(2),
                          );
                          if (raw === null) return;
                          const amount = Math.round(Number(raw) * 100);
                          if (!Number.isFinite(amount) || amount < 0) {
                            toast.error("Enter a valid amount");
                            return;
                          }
                          mutation.mutate({
                            id: row.id,
                            status: row.status as "paid" | "held",
                            amountCents: amount,
                            note: "Manual override",
                          });
                        }}
                      >
                        Override
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}
