import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminDepositRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  methodKey: string;
  amountCents: number;
  status: string;
  adminNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  screenshotUrl: string | null;
};

export const listDepositQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected"]).default("pending") }).parse(data),
  )
  .handler(async ({ context, data }): Promise<AdminDepositRow[]> => {
    const { data: allowed } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _key: "deposits.review",
    });
    if (!allowed) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("deposit_requests")
      .select(
        "id, user_id, method_key, amount_cents, screenshot_path, status, admin_note, submitted_at, reviewed_at",
      )
      .eq("status", data.status)
      .order("submitted_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);

    return Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("deposit-proofs")
          .createSignedUrl(row.screenshot_path, 3600);
        const profile = (profiles ?? []).find((p) => p.id === row.user_id);
        return {
          id: row.id,
          userId: row.user_id,
          fullName: profile?.full_name ?? "Member",
          email: profile?.email ?? "",
          methodKey: row.method_key,
          amountCents: row.amount_cents,
          status: row.status as string,
          adminNote: row.admin_note,
          submittedAt: row.submitted_at,
          reviewedAt: row.reviewed_at,
          screenshotUrl: signed?.signedUrl ?? null,
        };
      }),
    );
  });

export const adminReviewDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_review_deposit", {
      _id: data.id,
      _approve: data.approve,
      _note: data.note && data.note.length > 0 ? data.note : null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_methods")
      .select(
        "key, method_name, is_enabled, instructions_text, sort_order, network_label, receiving_address, min_deposit_cents, min_withdrawal_cents, fee_percent",
      )
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        key: z.string().trim().min(2).max(40),
        isEnabled: z.boolean(),
        instructions: z.string().trim().max(2000),
        networkLabel: z.string().trim().max(60).default(""),
        receivingAddress: z.string().trim().max(300).default(""),
        minDepositCents: z.number().int().min(0).max(10_000_000),
        minWithdrawalCents: z.number().int().min(0).max(10_000_000),
        feePercent: z.number().min(0).max(100),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_payment_method", {
      _key: data.key,
      _is_enabled: data.isEnabled,
      _instructions: data.instructions,
      _network_label: data.networkLabel,
      _receiving_address: data.receivingAddress,
      _min_deposit_cents: data.minDepositCents,
      _min_withdrawal_cents: data.minWithdrawalCents,
      _fee_percent: data.feePercent,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
