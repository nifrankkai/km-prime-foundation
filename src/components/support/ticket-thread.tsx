import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadSupportAttachment } from "@/lib/support-upload";
import { getTicketThread, replyToTicket } from "@/lib/support.functions";

export function TicketThreadView({
  ticketId,
  actions,
}: {
  ticketId: string;
  actions?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const fetchThread = useServerFn(getTicketThread);
  const reply = useServerFn(replyToTicket);
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ticket-thread", ticketId],
    queryFn: () => fetchThread({ data: { ticketId } }),
  });

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const attachmentPath = await uploadSupportAttachment(form.get("attachment") as File | null);
      return reply({ data: { ticketId, body, attachmentPath } });
    },
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["ticket-thread", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Reply sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading conversation…</p>;
  }

  const closed = data.ticket.status === "closed";

  return (
    <section className="rounded-2xl border border-border bg-card p-7 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">{data.ticket.subject}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.ticket.category.replace(/_/g, " ")} · opened{" "}
            {new Date(data.ticket.created_at).toLocaleString()}
            {data.member ? ` · ${data.member.fullName} (${data.member.email})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {data.ticket.status.replace(/_/g, " ")}
          </span>
          {actions}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {data.messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.is_staff
                ? "rounded-2xl border border-primary/30 bg-primary-soft/30 p-4"
                : "rounded-2xl border border-border bg-secondary/40 p-4"
            }
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {msg.is_staff ? "Support team" : "Member"} ·{" "}
              {new Date(msg.created_at).toLocaleString()}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{msg.body}</p>
            {msg.attachmentUrl && (
              <a
                href={msg.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"
              >
                <Paperclip className="size-3.5" /> View attachment
              </a>
            )}
          </div>
        ))}
      </div>

      {closed ? (
        <p className="mt-6 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          This ticket is closed. Open a new ticket if you still need help.
        </p>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(new FormData(event.currentTarget));
          }}
        >
          <Textarea
            className="min-h-28"
            placeholder="Write a reply…"
            value={body}
            maxLength={4000}
            onChange={(event) => setBody(event.target.value)}
            required
          />
          <Input name="attachment" type="file" />
          <Button type="submit" variant="prime" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send reply"}
          </Button>
        </form>
      )}
    </section>
  );
}
