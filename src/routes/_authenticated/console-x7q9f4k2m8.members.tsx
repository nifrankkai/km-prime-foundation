import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  adminAdjustWallet,
  adminSetMemberStatus,
  adminSetWalletFrozen,
  listAdminMembers,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/members")({
  component: AdminMembers,
});

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function AdminMembers() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const fetchMembers = useServerFn(listAdminMembers);
  const adjust = useServerFn(adminAdjustWallet);
  const freeze = useServerFn(adminSetWalletFrozen);
  const setStatus = useServerFn(adminSetMemberStatus);

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin-members", term],
    queryFn: () => fetchMembers({ data: { search: term } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-members"] });

  const adjustMutation = useMutation({
    mutationFn: (vars: { userId: string; amountCents: number; note: string }) =>
      adjust({ data: vars }),
    onSuccess: () => {
      toast.success("Wallet updated");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const freezeMutation = useMutation({
    mutationFn: (vars: { userId: string; frozen: boolean }) => freeze({ data: vars }),
    onSuccess: () => {
      toast.success("Wallet state updated");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { userId: string; status: "pending" | "active" | "inactive" }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Member status updated");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submitAdjust(userId: string, sign: 1 | -1, note: string) {
    const amount = Math.round(Number(amounts[userId] ?? "") * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount first");
      return;
    }
    adjustMutation.mutate({ userId, amountCents: amount * sign, note });
    setAmounts((prev) => ({ ...prev, [userId]: "" }));
  }


  return (
    <div className="space-y-6">
      <PanelCard
        title="Member management"
        description="Search members, adjust wallet balance and freeze accounts."
      >
        <form
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setTerm(search);
          }}
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or username"
            maxLength={120}
          />
          <Button type="submit" variant="prime">
            Search
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading members…</p>}
          {members?.length === 0 && (
            <p className="text-sm text-muted-foreground">No members match that search.</p>
          )}
          {members?.map((member) => (
            <div key={member.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{member.fullName || member.username}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {member.status} · licence {member.licenseStatus} · rank {member.rankKey}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-primary">{money(member.balanceCents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.frozen ? "Wallet frozen" : "Wallet active"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                  className="w-36"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount USD"
                  value={amounts[member.id] ?? ""}
                  onChange={(event) =>
                    setAmounts((prev) => ({ ...prev, [member.id]: event.target.value }))
                  }
                />
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="prime">
                      Credit
                    </Button>
                  }
                  title="Credit this wallet?"
                  description={`Are you sure you want to credit $${amounts[member.id] || "0.00"} to ${member.fullName || member.email}? This changes their balance immediately.`}
                  confirmLabel="Confirm credit"
                  reasonLabel="Reason"
                  reasonRequired
                  pending={adjustMutation.isPending}
                  onConfirm={(note) => submitAdjust(member.id, 1, note)}
                />
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      Debit
                    </Button>
                  }
                  title="Debit this wallet?"
                  description={`Are you sure you want to debit $${amounts[member.id] || "0.00"} from ${member.fullName || member.email}? This changes their balance immediately.`}
                  confirmLabel="Confirm debit"
                  destructive
                  reasonLabel="Reason"
                  reasonRequired
                  pending={adjustMutation.isPending}
                  onConfirm={(note) => submitAdjust(member.id, -1, note)}
                />
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      {member.frozen ? "Unfreeze wallet" : "Freeze wallet"}
                    </Button>
                  }
                  title={member.frozen ? "Unfreeze this wallet?" : "Freeze this wallet?"}
                  description={`Are you sure you want to ${member.frozen ? "unfreeze" : "freeze"} the wallet of ${member.fullName || member.email}?`}
                  confirmLabel="Confirm"
                  destructive={!member.frozen}
                  pending={freezeMutation.isPending}
                  onConfirm={() => freezeMutation.mutate({ userId: member.id, frozen: !member.frozen })}
                />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    statusMutation.mutate({
                      userId: member.id,
                      status: member.status === "active" ? "inactive" : "active",
                    })
                  }
                >
                  {member.status === "active" ? "Suspend member" : "Activate member"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
