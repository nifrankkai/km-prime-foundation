import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LifeBuoy, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { LicenseBanner } from "@/components/dashboard/license-banner";
import { PanelCard } from "@/components/dashboard/panel-card";
import { TicketThreadView } from "@/components/support/ticket-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { uploadSupportAttachment } from "@/lib/support-upload";
import {
  createSupportTicket,
  listMyTickets,
  TICKET_CATEGORIES,
} from "@/lib/support.functions";

type SupportSearch = { subject?: string | undefined; category?: string | undefined; new?: boolean | undefined };

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  validateSearch: (search: Record<string, unknown>): SupportSearch => ({
    subject: typeof search["subject"] === "string" ? search["subject"].slice(0, 140) : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
    new: search["new"] === true || search["new"] === "true",
  }),
  component: SupportPage,
});

function SupportPage() {
  const search = Route.useSearch();
  const { data: overview } = useMemberOverview();
  const queryClient = useQueryClient();
  const fetchTickets = useServerFn(listMyTickets);
  const create = useServerFn(createSupportTicket);

  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(search.new));
  const [subject, setSubject] = useState(search.subject ?? "");
  const [category, setCategory] = useState<(typeof TICKET_CATEGORIES)[number]["value"]>(
    (TICKET_CATEGORIES.find((item) => item.value === search.category)?.value ??
      "general_question") as (typeof TICKET_CATEGORIES)[number]["value"],
  );
  const [message, setMessage] = useState("");

  const { data: tickets } = useQuery({ queryKey: ["my-tickets"], queryFn: () => fetchTickets() });

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const attachmentPath = await uploadSupportAttachment(form.get("attachment") as File | null);
      return create({ data: { subject, category, message, attachmentPath } });
    },
    onSuccess: (result) => {
      toast.success("Ticket submitted — our team will reply shortly.");
      setSubject("");
      setMessage("");
      setShowForm(false);
      setOpenId(result.id);
      void queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (openId) {
    return (
      <div>
        <LicenseBanner overview={overview} />
        <Button variant="primeGhost" className="mb-4" onClick={() => setOpenId(null)}>
          <ArrowLeft /> Back to tickets
        </Button>
        <TicketThreadView ticketId={openId} />
      </div>
    );
  }

  return (
    <div>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <PanelCard
          title="Support"
          description="Open a ticket for withdrawal PIN resets, deposit questions or anything else."
        >
          {!showForm ? (
            <Button variant="prime" onClick={() => setShowForm(true)}>
              <LifeBuoy /> New ticket
            </Button>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate(new FormData(event.currentTarget));
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    className="mt-2"
                    value={subject}
                    maxLength={140}
                    onChange={(event) => setSubject(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as typeof category)}
                  >
                    {TICKET_CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  className="mt-2 min-h-32"
                  value={message}
                  maxLength={4000}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="attachment">
                  <span className="inline-flex items-center gap-2">
                    <Paperclip className="size-3.5" /> Attachment (optional)
                  </span>
                </Label>
                <Input id="attachment" name="attachment" className="mt-2" type="file" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="prime" disabled={mutation.isPending}>
                  {mutation.isPending ? "Submitting…" : "Submit ticket"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </PanelCard>

        <PanelCard title="My tickets" description="Follow the conversation with our support team.">
          {(tickets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">You have not opened any tickets yet.</p>
          ) : (
            <div className="space-y-3">
              {(tickets ?? []).map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setOpenId(ticket.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-left text-sm transition-colors hover:border-primary/40"
                >
                  <span className="font-semibold text-foreground">{ticket.subject}</span>
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
          )}
        </PanelCard>
      </div>
    </div>
  );
}
