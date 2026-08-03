import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlatformResetSettings = {
  isSuperAdmin: boolean;
  enabled: boolean;
  hasPassword: boolean;
  passwordSetAt: string | null;
};

export type SystemAuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  detail: string | null;
  createdAt: string;
};

export const INVALID_RESET_PASSWORD = "INVALID_RESET_PASSWORD";

/** Re-authenticates the caller with their own account password. Never logs the value. */
async function verifyAccountPassword(email: string | null, password: string) {
  if (!email) throw new Error("Your account email could not be verified.");
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Your account password is incorrect.");
  await client.auth.signOut();
}

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getPlatformResetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformResetSettings> => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isSuper) {
      return { isSuperAdmin: false, enabled: false, hasPassword: false, passwordSetAt: null };
    }
    const { data } = await supabase
      .from("platform_reset_settings")
      .select("enabled, password_hash, password_set_at")
      .eq("id", true)
      .maybeSingle();

    return {
      isSuperAdmin: true,
      enabled: data?.enabled ?? false,
      hasPassword: Boolean(data?.password_hash),
      passwordSetAt: data?.password_set_at ?? null,
    };
  });

export const listSystemAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemAuditEntry[]> => {
    await assertSuperAdmin(context);
    const { data, error } = await context.supabase
      .from("system_audit_log")
      .select("id, actor_email, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      detail: row.detail,
      createdAt: row.created_at,
    }));
  });

export const setPlatformResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { newPassword: string; confirmPassword: string; accountPassword: string }) =>
    z
      .object({
        newPassword: z.string().min(5, "The reset password must be at least 5 characters").max(128),
        confirmPassword: z.string().min(1).max(128),
        accountPassword: z.string().min(1, "Your account password is required").max(128),
      })
      .refine((v) => v.newPassword === v.confirmPassword, {
        message: "The two reset passwords do not match",
        path: ["confirmPassword"],
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    await verifyAccountPassword(
      (context.claims as { email?: string } | null)?.email ?? null,
      data.accountPassword,
    );
    const { error } = await context.supabase.rpc("set_platform_reset_password", {
      _password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setKillSwitchEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase.rpc("set_platform_reset_enabled", {
      _enabled: data.enabled,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const executePlatformReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { password: string; phrase: string }) =>
    z
      .object({
        password: z.string().min(1, "The reset password is required").max(128),
        phrase: z.literal("DELETE ALL DATA", {
          message: "Type the confirmation phrase exactly",
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Atomic, all-or-nothing wipe of every member record in the public schema.
    const { data: result, error } = await context.supabase.rpc("reset_platform_data", {
      _password: data.password,
    });
    if (error) {
      if (error.message.includes(INVALID_RESET_PASSWORD)) {
        throw new Error(INVALID_RESET_PASSWORD);
      }
      throw new Error(error.message);
    }

    // Remove the now-orphaned auth accounts, keeping the acting Super Admin.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let removedAccounts = 0;
    for (let page = 1; page <= 50; page += 1) {
      const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listError) break;
      const users = list?.users ?? [];
      if (users.length === 0) break;
      for (const user of users) {
        if (user.id === context.userId) continue;
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (!deleteError) removedAccounts += 1;
      }
      if (users.length < 200) break;
    }

    return {
      ok: true,
      accountsRemoved: (result as { accounts_removed?: number } | null)?.accounts_removed ?? removedAccounts,
    };
  });
