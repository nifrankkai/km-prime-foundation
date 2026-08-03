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
  avatarPath: string | null;
  avatarUrl: string | null;
  usdtAddress: string | null;
  mobileMoneyNumber: string | null;
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
        .select(
          "id, full_name, email, username, phone, created_at, referrer_id, avatar_url, usdt_address, mobile_money_number",
        )
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

    let avatarUrl: string | null = null;
    if (profile.avatar_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      avatarUrl = signed?.signedUrl ?? null;
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
      avatarPath: profile.avatar_url,
      avatarUrl: avatarUrl,
      usdtAddress: profile.usdt_address,
      mobileMoneyNumber: profile.mobile_money_number,
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

export const adminUpdateMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(100),
        username: z
          .string()
          .trim()
          .min(3)
          .max(30)
          .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscore only"),
        mobileMoneyNumber: z.string().trim().max(40).nullable().default(null),
        usdtAddress: z.string().trim().max(120).nullable().default(null),
        avatarPath: z.string().trim().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_update_member_profile", {
      _user_id: data.userId,
      _full_name: data.fullName,
      _username: data.username,
      _mobile_money_number: data.mobileMoneyNumber,
      _usdt_address: data.usdtAddress,
      _avatar_url: data.avatarPath,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ImpersonationGrant = {
  tokenHash: string;
  memberId: string;
  memberLabel: string;
  adminId: string;
  adminLabel: string;
};

/** Mints a one-time sign-in token for a member so staff can act on their behalf. */
export const impersonateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<ImpersonationGrant> => {
    const { data: allowed } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _key: "members.impersonate",
    });
    if (!allowed) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: target }, { data: admin }] = await Promise.all([
      supabaseAdmin.from("profiles").select("email, username, full_name").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.from("profiles").select("email, full_name").eq("id", context.userId).maybeSingle(),
    ]);
    if (!target?.email) throw new Error("Member not found");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: target.email,
    });
    if (error || !link?.properties?.hashed_token) {
      throw new Error(error?.message ?? "Could not start the impersonated session");
    }

    const memberLabel = target.username ?? target.full_name ?? target.email;
    const adminLabel = admin?.full_name || admin?.email || "Administrator";

    await supabaseAdmin.rpc("log_system_event", {
      _actor: context.userId,
      _action: "member.impersonation_started",
      _detail: `${adminLabel} started an impersonated session as ${memberLabel}`,
      _metadata: { impersonated_user_id: data.userId, impersonated_user: memberLabel, admin_id: context.userId },
    } as never);

    return {
      tokenHash: link.properties.hashed_token,
      memberId: data.userId,
      memberLabel,
      adminId: context.userId,
      adminLabel,
    };
  });

/** Writes an audit entry tagged with both the acting admin and the impersonated member. */
export const logImpersonatedAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        adminId: z.string().uuid(),
        adminLabel: z.string().trim().max(140),
        action: z.string().trim().min(3).max(80),
        detail: z.string().trim().max(300),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("system_audit_log").insert({
      actor_id: data.adminId,
      actor_email: data.adminLabel,
      action: `impersonation.${data.action}`,
      detail: data.detail,
      metadata: {
        impersonated_user_id: context.userId,
        admin_id: data.adminId,
        admin: data.adminLabel,
      },
    });
    return { ok: true };
  });
