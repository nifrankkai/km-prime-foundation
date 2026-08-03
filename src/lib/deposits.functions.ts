import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentMethodRow = {
  key: string;
  method_name: string;
  is_enabled: boolean;
  instructions_text: string;
  sort_order: number;
};

export type DepositRow = {
  id: string;
  method_key: string;
  amount_cents: number;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

export const listEnabledPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentMethodRow[]> => {
    const { data, error } = await context.supabase
      .from("payment_methods")
      .select("key, method_name, is_enabled, instructions_text, sort_order")
      .eq("is_enabled", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentMethodRow[];
  });

export const listMyDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DepositRow[]> => {
    const { data, error } = await context.supabase
      .from("deposit_requests")
      .select("id, method_key, amount_cents, status, admin_note, submitted_at, reviewed_at")
      .eq("user_id", context.userId)
      .order("submitted_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as DepositRow[];
  });

const depositSchema = z.object({
  methodKey: z.string().trim().min(2).max(40),
  amountCents: z.number().int().min(100).max(1_000_000_00),
  screenshotPath: z.string().trim().min(3).max(300),
});

export const submitDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => depositSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("submit_deposit", {
      _method_key: data.methodKey,
      _amount_cents: data.amountCents,
      _screenshot_path: data.screenshotPath,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
