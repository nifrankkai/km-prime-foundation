import { supabase } from "@/integrations/supabase/client";

export const IMPERSONATION_KEY = "km-prime.impersonation";

export type ImpersonationState = {
  adminId: string;
  adminLabel: string;
  memberId: string;
  memberLabel: string;
  adminSession: { access_token: string; refresh_token: string };
  startedAt: string;
};

export function readImpersonation(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationState) : null;
  } catch {
    return null;
  }
}

export function writeImpersonation(state: ImpersonationState) {
  window.localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
}

export function clearImpersonation() {
  if (typeof window !== "undefined") window.localStorage.removeItem(IMPERSONATION_KEY);
}

/** Swaps the current browser session for the impersonated member's session. */
export async function beginImpersonation(grant: {
  tokenHash: string;
  memberId: string;
  memberLabel: string;
  adminId: string;
  adminLabel: string;
}) {
  const { data: current } = await supabase.auth.getSession();
  const adminSession = current.session;
  if (!adminSession) throw new Error("Your admin session expired — sign in again.");

  const { error } = await supabase.auth.verifyOtp({
    token_hash: grant.tokenHash,
    type: "magiclink",
  });
  if (error) throw new Error(error.message);

  writeImpersonation({
    adminId: grant.adminId,
    adminLabel: grant.adminLabel,
    memberId: grant.memberId,
    memberLabel: grant.memberLabel,
    adminSession: {
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    },
    startedAt: new Date().toISOString(),
  });
}

/** Restores the administrator's own session. */
export async function endImpersonation(state: ImpersonationState) {
  const { error } = await supabase.auth.setSession(state.adminSession);
  clearImpersonation();
  if (error) throw new Error(error.message);
}
