import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { TicketThreadView } from "@/components/support/ticket-thread";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { adminResetWithdrawalPin } from "@/lib/member-admin.functions";
import {
  adminSetTicketStatus,
  getTicketThread,
  listSupportTickets,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
} from "@/lib/support.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/support")({
  component: AdminSupport,
});

function AdminSupport() {
  const { can } = useAdminAccess();
  const queryClient = useQueryClient();
  const fetchTickets = useServerFn(listSupportTickets);
  const fetchThread = useServerFn(getTicketThread);
  const setStatus = useServerFn(adminSetTicketStatus);
  const resetPin = useServerFn(adminResetWithdrawalPin);

  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatusFilter] = useState<"all" | (typeof TICKET_STATUSES)[number]>("all");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets", status, category, term],
    queryFn: () =>
      fetchTickets({
        data: { status, category: category as "all", search: term },
      }),
  });

  const { data: thread } = useQuery({
    queryKey: ["ticket-thread", openId],
    queryFn: () => fetchThread({ data: { ticketId: openId! } }),
    enabled: Boolean(openId),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { ticketId: string; status: (typeof TICKET_STATUSES)[number] }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Ticket updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["ticket-thread"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pinMutation = useMutation({
    mutationFn: (vars: { userId: string; reason: string }) => resetPin({ data: vars }),
    onSuccess: () => toast.success("Withdrawal PIN cleared — the member can set a new one."),
    onError: (error: Error) => toast.error(error.message),
  });

  if (!can("manage_support_tickets")) {
    return (
      <PanelCard title="Support tickets" description="You do not have access to support tickets.">
        <p className="text-sm text-muted-foreground">
          Ask a Super Administrator for the “manage_support_tickets” permission.
        </p>
      </PanelCard>
    );
  }

  if (openId) {
    return (
      <div>
        <Button variant="primeGhost" className="mb-4" onClick={() => setOpenId(null)}>
          <ArrowLeft /> Back to queue
        </Button>
        <TicketThreadView
          ticketId={openId}
          actions={
            <>
              {can("reset_withdrawal_pin") && thread && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <KeyRound className="size-3.5" /> Reset withdrawal PIN
                    </Button>
                  }
                  title="Reset this member's withdrawal PIN?"
                  description={`This clears the withdrawal PIN for ${thread.member?.email ?? "this member"}. They will be asked to set a new one before their next payout.`}
                  confirmLabel="Reset PIN"
                  destructive
                  reasonLabel="Reason"
                  reasonRequired
                  pending={pinMutation.isPending}
                  onConfirm={(reason) =>
                    pinMutation.mutate({ userId: thread.ticket.user_id, reason })
                  }
                />
              )}
              <select
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm"
                value={thread?.ticket.status ?? "open"}
                onChange={(event) =>
                  statusMutation.mutate({
                    ticketId: openId,
                    status: event.target.value as (typeof TICKET_STATUSES)[number],
                  })
                }
              >
                {TICKET_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </>
          }
        />
      </div>
    );
  }

  return (
    <PanelCard
      title="Support tickets"
      description="Answer member questions and handle withdrawal PIN reset requests."
    >
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setTerm(search);
        }}
      >
        <Input
          className="max-w-xs"
          value={search}
          placeholder="Search subject"
          maxLength={120}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatusFilter(event.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {TICKET_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="prime">
          Search
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading tickets…</p>}
        {tickets?.length === 0 && (
          <p className="text-sm text-muted-foreground">No tickets match those filters.</p>
        )}
        {tickets?.map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            onClick={() => setOpenId(ticket.id)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-left text-sm transition-colors hover:border-primary/40"
          >
            <span>
              <span className="block font-semibold text-foreground">{ticket.subject}</span>
              <span className="text-xs text-muted-foreground">
                {ticket.fullName} · {ticket.email}
              </span>
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {ticket.category.replace(/_/g, " ")}
            </span>
            <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {ticket.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(ticket.last_reply_at).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </PanelCard>
  );
}
