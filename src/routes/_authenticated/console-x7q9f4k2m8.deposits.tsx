import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminReviewDeposit, listDepositQueue } from "@/lib/deposit-admin.functions";
import { money, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/deposits")({
  component: AdminDeposits,
});

type Filter = "pending" | "approved" | "rejected";

function AdminDeposits() {
  const [filter, setFilter] = useState<Filter>("pending");
  const queryClient = useQueryClient();
  const fetchQueue = useServerFn(listDepositQueue);
  const review = useServerFn(adminReviewDeposit);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-deposits", filter],
    queryFn: () => fetchQueue({ data: { status: filter } }),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; approve: boolean; note?: string }) => review({ data: vars }),
    onSuccess: () => {
      toast.success("Deposit updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard
      title="Pending deposits"
      description="Review payment proofs. Approving credits the member wallet immediately and writes an audit entry."
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
        {isLoading && <p className="text-sm text-muted-foreground">Loading deposits…</p>}
        {rows?.length === 0 && <p className="text-sm text-muted-foreground">Queue is empty.</p>}
        {rows?.map((row) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{row.fullName}</p>
                <p className="text-sm text-muted-foreground">{row.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {titleCase(row.methodKey)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {new Date(row.submittedAt).toLocaleString()}
                </p>
              </div>
              <p className="text-xl font-extrabold text-primary">{money(row.amountCents)}</p>
            </div>

            {row.screenshotUrl && (
              <a
                href={row.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-fit overflow-hidden rounded-xl border border-border"
              >
                <img
                  src={row.screenshotUrl}
                  alt={`Payment proof from ${row.fullName}`}
                  className="max-h-56 w-auto object-contain transition-transform hover:scale-105"
                  loading="lazy"
                />
              </a>
            )}
            {row.screenshotUrl && (
              <p className="mt-2 text-xs text-muted-foreground">Click the image to open it full size.</p>
            )}

            {row.adminNote && <p className="mt-3 text-xs text-muted-foreground">Note: {row.adminNote}</p>}

            {filter === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="prime">
                      Approve
                    </Button>
                  }
                  title="Approve this deposit?"
                  description={`Are you sure you want to approve this deposit of ${money(row.amountCents)} for ${row.fullName}? This will credit their wallet immediately.`}
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
                  title="Reject this deposit?"
                  description={`Are you sure you want to reject this deposit of ${money(row.amountCents)} for ${row.fullName}? No balance will change.`}
                  confirmLabel="Confirm rejection"
                  destructive
                  reasonLabel="Reason (optional)"
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
