import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { adminReviewWithdrawal, listWithdrawalQueue } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/withdrawals")({
  component: AdminWithdrawals,
});

type Filter = "pending" | "approved" | "rejected";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function AdminWithdrawals() {
  const [filter, setFilter] = useState<Filter>("pending");
  const queryClient = useQueryClient();
  const fetchQueue = useServerFn(listWithdrawalQueue);
  const review = useServerFn(adminReviewWithdrawal);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: () => fetchQueue({ data: { status: filter } }),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; approve: boolean; note?: string }) => review({ data: vars }),
    onSuccess: () => {
      toast.success("Withdrawal updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard
      title="Withdrawal queue"
      description="Approving a request debits the member wallet and logs an immutable transaction."
    >
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as Filter[]).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "prime" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading requests…</p>}
        {rows?.length === 0 && <p className="text-sm text-muted-foreground">Queue is empty.</p>}
        {rows?.map((row) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{row.fullName}</p>
                <p className="text-sm text-muted-foreground">{row.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {row.method.replace("_", " ")} → {row.destination}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-xl font-extrabold text-primary">{money(row.amount_cents)}</p>
            </div>

            {row.admin_note && (
              <p className="mt-3 text-xs text-muted-foreground">Note: {row.admin_note}</p>
            )}

            {filter === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="prime">
                      Approve &amp; debit
                    </Button>
                  }
                  title="Approve this withdrawal?"
                  description={`Are you sure you want to approve this withdrawal of ${money(row.amount_cents)} for ${row.fullName}? This will deduct from their wallet and mark it as paid.`}
                  confirmLabel="Confirm approval"
                  reasonLabel="Note (optional)"
                  pending={mutation.isPending}
                  onConfirm={(note) => mutation.mutate({ id: row.id, approve: true, note })}
                />
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      Reject
                    </Button>
                  }
                  title="Reject this withdrawal?"
                  description={`Are you sure you want to reject this withdrawal of ${money(row.amount_cents)} for ${row.fullName}? No balance will change.`}
                  confirmLabel="Confirm rejection"
                  destructive
                  reasonLabel="Reason"
                  reasonRequired
                  pending={mutation.isPending}
                  onConfirm={(note) => mutation.mutate({ id: row.id, approve: false, note })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
