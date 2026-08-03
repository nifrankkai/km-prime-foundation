import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyProfile = {
  id: string;
  fullName: string;
  email: string;
  username: string | null;
  phone: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  usdtAddress: string | null;
  mobileMoneyNumber: string | null;
  hasPin: boolean;
  pinSetAt: string | null;
};

async function signedAvatar(
  supabase: { storage: { from: (b: string) => { createSignedUrl: (p: string, s: number) => Promise<{ data: { signedUrl: string } | null }> } } },
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile> => {
    const [{ data: profile, error }, { data: member }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, email, username, phone, avatar_url, usdt_address, mobile_money_number")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("members")
        .select("pin_set_at")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Profile not found");

    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      username: profile.username,
      phone: profile.phone,
      avatarPath: profile.avatar_url,
      avatarUrl: await signedAvatar(context.supabase, profile.avatar_url),
      usdtAddress: profile.usdt_address,
      mobileMoneyNumber: profile.mobile_money_number,
      hasPin: Boolean(member?.pin_set_at),
      pinSetAt: member?.pin_set_at ?? null,
    };
  });

/** Members may only change their display name and picture — everything else is locked. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(100),
        avatarPath: z.string().trim().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const patch: { full_name: string; avatar_url?: string } = { full_name: data.fullName };
    if (data.avatarPath) patch.avatar_url = data.avatarPath;

    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
