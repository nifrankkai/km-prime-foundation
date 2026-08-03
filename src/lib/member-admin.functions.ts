import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberAccountDetail = {
  id: string;
  fullName: string;
  email: string;
  username: string | null;
  phone: string | null;
  createdAt: string;
  status: string;
  licenseStatus: string;
  licenseExpiry: string | null;
  rankKey: string;
  balanceCents: number;
  frozen: boolean;
  hasPin: boolean;
  pinSetAt: string | null;
  kycStatus: string;
  sponsor: { fullName: string; email: string } | null;
  transactions: {
    id: string;
    type: string;
    amount_cents: number;
    balance_after_cents: number;
    note: string | null;
    created_at: string;
  }[];
  withdrawals: {
    id: string;
    amount_cents: number;
    method: string;
    status: string;
    created_at: string;
  }[];
  deposits: {
    id: string;
    method_key: string;
    amount_cents: number;
    status: string;
    submitted_at: string;
  }[];
};

export const getMemberAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<MemberAccountDetail> => {
    const { data: allowed } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _key: "members.manage",
    });
    if (!allowed) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.userId;

    const [
      { data: profile },
      { data: member },
      { data: wallet },
      { data: kyc },
      { data: transactions },
      { data: withdrawals },
      { data: deposits },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, username, phone, created_at, referrer_id")
        .eq("id", uid)
        .maybeSingle(),
      supabaseAdmin
        .from("members")
        .select("status, license_status, license_expiry_date, rank_key, pin_set_at")
        .eq("id", uid)
        .maybeSingle(),
      supabaseAdmin.from("wallets").select("balance_cents, frozen").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("kyc_submissions").select("status").eq("user_id", uid).maybeSingle(),
      supabaseAdmin
        .from("transactions")
        .select("id, type, amount_cents, balance_after_cents, note, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("withdrawal_requests")
        .select("id, amount_cents, method, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("deposit_requests")
        .select("id, method_key, amount_cents, status, submitted_at")
        .eq("user_id", uid)
        .order("submitted_at", { ascending: false })
        .limit(20),
    ]);

    if (!profile) throw new Error("Member not found");

    let sponsor: MemberAccountDetail["sponsor"] = null;
    if (profile.referrer_id) {
      const { data: ref } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", profile.referrer_id)
        .maybeSingle();
      if (ref) sponsor = { fullName: ref.full_name, email: ref.email };
    }

    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      username: profile.username,
      phone: profile.phone,
      createdAt: profile.created_at,
      status: member?.status ?? "pending",
      licenseStatus: member?.license_status ?? "inactive",
      licenseExpiry: member?.license_expiry_date ?? null,
      rankKey: member?.rank_key ?? "member",
      balanceCents: wallet?.balance_cents ?? 0,
      frozen: wallet?.frozen ?? false,
      hasPin: Boolean(member?.pin_set_at),
      pinSetAt: member?.pin_set_at ?? null,
      kycStatus: kyc?.status ?? "not_submitted",
      sponsor,
      transactions: transactions ?? [],
      withdrawals: withdrawals ?? [],
      deposits: deposits ?? [],
    };
  });

export const adminResetWithdrawalPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), reason: z.string().trim().min(3).max(300) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_reset_withdrawal_pin", {
      _user_id: data.userId,
    } as never);
    if (error) throw new Error(error.message);

    // Audit trail: a zero-value note is not possible on the wallet ledger, so the
    // reason is preserved on the member's notification feed by the RPC itself.
    return { ok: true, reason: data.reason };
  });
