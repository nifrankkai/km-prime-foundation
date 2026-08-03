import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAccess } from "@/hooks/use-admin-access";
import {
  adminAdjustWallet,
  adminSetMemberStatus,
  adminSetWalletFrozen,
  listAdminMembers,
} from "@/lib/admin.functions";
import { adminResetWithdrawalPin, getMemberAccount } from "@/lib/member-admin.functions";
import { money, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/members")({
  component: AdminMembers,
});

function AdminMembers() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchMembers = useServerFn(listAdminMembers);

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin-members", term],
    queryFn: () => fetchMembers({ data: { search: term } }),
  });

  if (openId) {
    return (
      <div>
        <Button variant="primeGhost" className="mb-4" onClick={() => setOpenId(null)}>
          <ArrowLeft /> Back to members
        </Button>
        <MemberDetail userId={openId} />
      </div>
    );
  }

  return (
    <PanelCard
      title="Member management"
      description="Search members and open a full account view to adjust balances, freeze wallets or reset a withdrawal PIN."
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
          <button
            key={member.id}
            type="button"
            onClick={() => setOpenId(member.id)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40"
          >
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
          </button>
        ))}
      </div>
    </PanelCard>
  );
}

function MemberDetail({ userId }: { userId: string }) {
  const { can } = useAdminAccess();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const fetchAccount = useServerFn(getMemberAccount);
  const adjust = useServerFn(adminAdjustWallet);
  const freeze = useServerFn(adminSetWalletFrozen);
  const setStatus = useServerFn(adminSetMemberStatus);
  const resetPin = useServerFn(adminResetWithdrawalPin);

  const { data: account, isLoading } = useQuery({
    queryKey: ["admin-member", userId],
    queryFn: () => fetchAccount({ data: { userId } }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-member", userId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-members"] });
  };

  const adjustMutation = useMutation({
    mutationFn: (vars: { userId: string; amountCents: number; note: string }) =>
      adjust({ data: vars }),
    onSuccess: () => {
      toast.success("Wallet updated");
      setAmount("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const freezeMutation = useMutation({
    mutationFn: (vars: { userId: string; frozen: boolean }) => freeze({ data: vars }),
    onSuccess: () => {
      toast.success("Wallet state updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { userId: string; status: "pending" | "active" | "inactive" }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Member status updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pinMutation = useMutation({
    mutationFn: (vars: { userId: string; reason: string }) => resetPin({ data: vars }),
    onSuccess: () => {
      toast.success("Withdrawal PIN cleared");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !account) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>;
  }

  function submitAdjust(sign: 1 | -1, note: string) {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter a valid amount first");
      return;
    }
    adjustMutation.mutate({ userId, amountCents: cents * sign, note });
  }

  return (
    <div className="space-y-6">
      <PanelCard
        title={account.fullName || account.email}
        description={`${account.email}${account.username ? ` · @${account.username}` : ""}${account.phone ? ` · ${account.phone}` : ""}`}
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Wallet balance" value={money(account.balanceCents)} accent />
          <Stat label="Account status" value={titleCase(account.status)} />
          <Stat label="Licence" value={titleCase(account.licenseStatus)} />
          <Stat label="KYC" value={titleCase(account.kycStatus)} />
          <Stat label="Rank" value={titleCase(account.rankKey)} />
          <Stat
            label="Licence expiry"
            value={account.licenseExpiry ? new Date(account.licenseExpiry).toLocaleDateString() : "—"}
          />
          <Stat label="Withdrawal PIN" value={account.hasPin ? "Set" : "Not set"} />
          <Stat label="Sponsor" value={account.sponsor?.fullName ?? "—"} />
        </div>
      </PanelCard>

      <PanelCard
        title="Account actions"
        description="Every balance-affecting action is confirmed and written to the transaction audit trail."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="adjust-amount">Amount (USD)</Label>
            <Input
              id="adjust-amount"
              className="mt-2 w-40"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={!can("adjust_balance")}
            />
          </div>

          <ConfirmDialog
            trigger={
              <Button variant="prime" disabled={!can("adjust_balance")}>
                Credit
              </Button>
            }
            title="Credit this wallet?"
            description={`Credit $${amount || "0.00"} to ${account.fullName || account.email}. Their balance changes immediately.`}
            confirmLabel="Confirm credit"
            reasonLabel="Reason (audit log)"
            reasonRequired
            pending={adjustMutation.isPending}
            onConfirm={(note) => submitAdjust(1, note)}
          />

          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={!can("adjust_balance")}>
                Debit
              </Button>
            }
            title="Debit this wallet?"
            description={`Debit $${amount || "0.00"} from ${account.fullName || account.email}. Their balance changes immediately.`}
            confirmLabel="Confirm debit"
            destructive
            reasonLabel="Reason (audit log)"
            reasonRequired
            pending={adjustMutation.isPending}
            onConfirm={(note) => submitAdjust(-1, note)}
          />

          <ConfirmDialog
            trigger={
              <Button variant="outline">{account.frozen ? "Unfreeze wallet" : "Freeze wallet"}</Button>
            }
            title={account.frozen ? "Unfreeze this wallet?" : "Freeze this wallet?"}
            description={`This ${account.frozen ? "restores" : "blocks"} all wallet movement for ${account.email}.`}
            confirmLabel="Confirm"
            destructive={!account.frozen}
            pending={freezeMutation.isPending}
            onConfirm={() => freezeMutation.mutate({ userId, frozen: !account.frozen })}
          />

          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={!can("reset_withdrawal_pin") || !account.hasPin}>
                <KeyRound className="size-3.5" /> Reset withdrawal PIN
              </Button>
            }
            title="Reset this member's withdrawal PIN?"
            description={`${account.email} will be asked to set a new 4-digit PIN before their next payout.`}
            confirmLabel="Reset PIN"
            destructive
            reasonLabel="Reason (audit log)"
            reasonRequired
            pending={pinMutation.isPending}
            onConfirm={(reason) => pinMutation.mutate({ userId, reason })}
          />

          <ConfirmDialog
            trigger={
              <Button variant="outline">
                {account.status === "active" ? "Suspend member" : "Activate member"}
              </Button>
            }
            title={account.status === "active" ? "Suspend this member?" : "Activate this member?"}
            description={`This changes the account status for ${account.email}.`}
            confirmLabel="Confirm"
            destructive={account.status === "active"}
            pending={statusMutation.isPending}
            onConfirm={() =>
              statusMutation.mutate({
                userId,
                status: account.status === "active" ? "inactive" : "active",
              })
            }
          />
        </div>
      </PanelCard>

      <PanelCard title="Recent transactions" description="Immutable wallet audit trail.">
        {account.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallet movements yet.</p>
        ) : (
          <div className="space-y-2">
            {account.transactions.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
              >
                <span className="font-medium">{titleCase(row.type)}</span>
                <span className="text-xs text-muted-foreground">{row.note ?? "—"}</span>
                <span
                  className={
                    row.amount_cents >= 0 ? "font-bold text-primary" : "font-bold text-destructive"
                  }
                >
                  {money(row.amount_cents)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Withdrawals" description="Payout requests from this member.">
          {account.withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <div className="space-y-2">
              {account.withdrawals.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
                >
                  <span className="font-semibold">{money(row.amount_cents)}</span>
                  <span className="text-muted-foreground">{titleCase(row.method)}</span>
                  <span className="text-xs uppercase text-muted-foreground">{row.status}</span>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Deposits" description="Funding requests from this member.">
          {account.deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <div className="space-y-2">
              {account.deposits.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
                >
                  <span className="font-semibold">{money(row.amount_cents)}</span>
                  <span className="text-muted-foreground">{titleCase(row.method_key)}</span>
                  <span className="text-xs uppercase text-muted-foreground">{row.status}</span>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={accent ? "mt-1 text-xl font-extrabold text-primary" : "mt-1 text-lg font-bold"}>
        {value}
      </p>
    </div>
  );
}
