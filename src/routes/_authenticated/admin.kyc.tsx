import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { adminReviewKyc, listKycQueue } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: AdminKyc,
});

type Filter = "pending" | "approved" | "rejected";

function AdminKyc() {
  const [filter, setFilter] = useState<Filter>("pending");
  const queryClient = useQueryClient();
  const fetchQueue = useServerFn(listKycQueue);
  const review = useServerFn(adminReviewKyc);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-kyc", filter],
    queryFn: () => fetchQueue({ data: { status: filter } }),
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; approve: boolean; reason?: string }) =>
      review({ data: vars }),
    onSuccess: () => {
      toast.success("KYC decision recorded");
      void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard title="KYC queue" description="Approve or reject member identity submissions.">
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
        {isLoading && <p className="text-sm text-muted-foreground">Loading submissions…</p>}
        {rows?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing in this queue.</p>
        )}
        {rows?.map((row) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-5">
            <p className="font-semibold">{row.fullName}</p>
            <p className="text-sm text-muted-foreground">{row.email}</p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>Document type: {row.document_type}</li>
              <li>ID file: {row.id_document_path}</li>
              <li>Selfie: {row.selfie_path}</li>
              <li>Address proof: {row.address_proof_path ?? "not provided"}</li>
              <li>
                Submitted:{" "}
                {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "unknown"}
              </li>
              {row.rejection_reason && <li>Previous reason: {row.rejection_reason}</li>}
            </ul>

            {filter === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="prime"
                  onClick={() => mutation.mutate({ userId: row.user_id, approve: true })}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const reason = window.prompt("Rejection reason") ?? "";
                    if (reason.trim().length < 3) {
                      toast.error("Provide a reason");
                      return;
                    }
                    mutation.mutate({ userId: row.user_id, approve: false, reason });
                  }}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
