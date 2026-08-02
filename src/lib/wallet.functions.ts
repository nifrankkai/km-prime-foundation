import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletTransaction = {
  id: string;
  type: string;
  amount_cents: number;
  balance_after_cents: number;
  note: string | null;
  created_at: string;
};

export type WithdrawalRow = {
  id: string;
  amount_cents: number;
  method: string;
  destination: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

export type WalletSnapshot = {
  balanceCents: number;
  pendingCents: number;
  availableCents: number;
  frozen: boolean;
  kycApproved: boolean;
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRow[];
};

export const getWalletSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletSnapshot> => {
    const { supabase, userId } = context;

    const [{ data: wallet }, { data: transactions }, { data: withdrawals }, { data: kyc }] =
      await Promise.all([
        supabase.from("wallets").select("balance_cents, frozen").eq("user_id", userId).maybeSingle(),
        supabase
          .from("transactions")
          .select("id, type, amount_cents, balance_after_cents, note, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("withdrawal_requests")
          .select("id, amount_cents, method, destination, status, admin_note, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("kyc_submissions").select("status").maybeSingle(),
      ]);

    const balanceCents = wallet?.balance_cents ?? 0;
    const pendingCents = (withdrawals ?? [])
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + row.amount_cents, 0);

    return {
      balanceCents,
      pendingCents,
      availableCents: Math.max(0, balanceCents - pendingCents),
      frozen: wallet?.frozen ?? false,
      kycApproved: kyc?.status === "approved",
      transactions: (transactions ?? []) as WalletTransaction[],
      withdrawals: (withdrawals ?? []) as WithdrawalRow[],
    };
  });

const withdrawalSchema = z.object({
  amountCents: z.number().int().min(1000).max(100_000_00),
  method: z.enum(["visa", "mastercard", "usdt", "mobile_money", "bank_transfer", "manual"]),
  destination: z.string().trim().min(4).max(200),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => withdrawalSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("request_withdrawal", {
      _amount_cents: data.amountCents,
      _method: data.method,
      _destination: data.destination,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_at: string;
};

export const listPublishedAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnnouncementRow[]> => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id, title, body, published_at, created_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data ?? []) as AnnouncementRow[];
  });
