import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
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

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="prime" onClick={() => handleAdjust(member.id, 1)}>
                  Credit
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAdjust(member.id, -1)}>
                  Debit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    freezeMutation.mutate({ userId: member.id, frozen: !member.frozen })
                  }
                >
                  {member.frozen ? "Unfreeze wallet" : "Freeze wallet"}
                </Button>
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
