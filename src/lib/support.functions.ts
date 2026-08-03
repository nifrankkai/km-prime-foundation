import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TICKET_CATEGORIES = [
  { value: "withdrawal_pin_reset", label: "Withdrawal PIN reset" },
  { value: "deposit_issue", label: "Deposit issue" },
  { value: "withdrawal_issue", label: "Withdrawal issue" },
  { value: "account_issue", label: "Account issue" },
  { value: "general_question", label: "General question" },
  { value: "other", label: "Other" },
] as const;

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export type TicketRow = {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_reply_at: string;
};

export type TicketMessage = {
  id: string;
  body: string;
  is_staff: boolean;
  author_id: string | null;
  attachment_path: string | null;
  attachmentUrl: string | null;
  created_at: string;
};

export type TicketThread = {
  ticket: TicketRow & { user_id: string };
  messages: TicketMessage[];
  member: { fullName: string; email: string; username: string | null } | null;
};

const categoryEnum = z.enum([
  "withdrawal_pin_reset",
  "deposit_issue",
  "withdrawal_issue",
  "account_issue",
  "general_question",
  "other",
]);

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TicketRow[]> => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("id, subject, category, status, created_at, last_reply_at")
      .eq("user_id", context.userId)
      .order("last_reply_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as TicketRow[];
  });

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        subject: z.string().trim().min(3).max(140),
        category: categoryEnum,
        message: z.string().trim().min(5).max(4000),
        attachmentPath: z.string().trim().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc("create_support_ticket", {
      _subject: data.subject,
      _category: data.category,
      _message: data.message,
      _attachment_path: data.attachmentPath,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const getTicketThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<TicketThread> => {
    const { data: ticket, error } = await context.supabase
      .from("support_tickets")
      .select("id, user_id, subject, category, status, created_at, last_reply_at")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Ticket not found");

    const { data: messages } = await context.supabase
      .from("support_ticket_messages")
      .select("id, body, is_staff, author_id, attachment_path, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email, username")
      .eq("id", ticket.user_id)
      .maybeSingle();

    const withUrls = await Promise.all(
      (messages ?? []).map(async (row) => {
        let attachmentUrl: string | null = null;
        if (row.attachment_path) {
          const { data: signed } = await context.supabase.storage
            .from("support-attachments")
            .createSignedUrl(row.attachment_path, 3600);
          attachmentUrl = signed?.signedUrl ?? null;
        }
        return { ...row, attachmentUrl } as TicketMessage;
      }),
    );

    return {
      ticket: ticket as TicketThread["ticket"],
      messages: withUrls,
      member: profile
        ? { fullName: profile.full_name, email: profile.email, username: profile.username }
        : null,
    };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ticketId: z.string().uuid(),
        body: z.string().trim().min(2).max(4000),
        attachmentPath: z.string().trim().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("add_ticket_reply", {
      _ticket_id: data.ticketId,
      _body: data.body,
      _attachment_path: data.attachmentPath,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminTicketRow = TicketRow & {
  user_id: string;
  fullName: string;
  email: string;
};

export const listSupportTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.enum(["all", ...TICKET_STATUSES]).default("all"),
        category: z.enum(["all", ...categoryEnum.options]).default("all"),
        search: z.string().trim().max(120).default(""),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<AdminTicketRow[]> => {
    const { data: allowed } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _key: "manage_support_tickets",
    });
    if (!allowed) throw new Error("Forbidden");

    let query = context.supabase
      .from("support_tickets")
      .select("id, user_id, subject, category, status, created_at, last_reply_at")
      .order("last_reply_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") query = query.eq("status", data.status);
    if (data.category !== "all") query = query.eq("category", data.category);
    if (data.search) query = query.ilike("subject", `%${data.search}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [...new Set(rows.map((r) => r.user_id))]);

    return rows.map((row) => {
      const profile = (profiles ?? []).find((p) => p.id === row.user_id);
      return {
        ...row,
        fullName: profile?.full_name ?? "Member",
        email: profile?.email ?? "",
      } as AdminTicketRow;
    });
  });

export const adminSetTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ticketId: z.string().uuid(), status: z.enum(TICKET_STATUSES) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_ticket_status", {
      _ticket_id: data.ticketId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
