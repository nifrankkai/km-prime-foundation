import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PvRecordRow = {
  userId: string;
  fullName: string;
  username: string | null;
  email: string;
  rankKey: string;
  currentPersonalPv: number;
  currentGroupPv: number;
  lastPersonalPv: number;
  lastGroupPv: number;
};

export type PvDetail = {
  userId: string;
  fullName: string;
  history: { periodMonth: string; personalPv: number; groupPv: number; rankKey: string | null }[];
  transactions: {
    id: string;
    type: string;
    pvAmount: number;
    level: number;
    periodMonth: string;
    createdAt: string;
    sourceName: string | null;
  }[];
};

function monthKey(offset = 0) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function assertPvAccess(supabase: {
  rpc: (fn: "has_permission", args: { _user_id: string; _key: string }) => Promise<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_permission", { _user_id: userId, _key: "reports.view" });
  if (data !== true) throw new Error("Forbidden");
}

/** Staff view of live PV counters for the current period plus the closed previous period. */
export const listPvRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PvRecordRow[]> => {
    await assertPvAccess(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const current = monthKey(0);
    const previous = monthKey(-1);

    const [{ data: profiles }, { data: members }, { data: currentPv }, { data: lastPv }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, full_name, username, email"),
        supabaseAdmin.from("members").select("id, rank_key"),
        supabaseAdmin
          .from("pv_totals")
          .select("user_id, personal_pv, group_pv")
          .eq("period_month", current),
        supabaseAdmin
          .from("pv_period_history")
          .select("user_id, personal_pv, group_pv")
          .eq("period_month", previous),
      ]);

    const rank = new Map((members ?? []).map((m) => [m.id, m.rank_key]));
    const cur = new Map((currentPv ?? []).map((r) => [r.user_id, r]));
    const last = new Map((lastPv ?? []).map((r) => [r.user_id, r]));

    return (profiles ?? [])
      .map((p) => ({
        userId: p.id,
        fullName: p.full_name,
        username: p.username,
        email: p.email,
        rankKey: rank.get(p.id) ?? "member",
        currentPersonalPv: cur.get(p.id)?.personal_pv ?? 0,
        currentGroupPv: cur.get(p.id)?.group_pv ?? 0,
        lastPersonalPv: last.get(p.id)?.personal_pv ?? 0,
        lastGroupPv: last.get(p.id)?.group_pv ?? 0,
      }))
      .sort(
        (a, b) =>
          b.currentPersonalPv + b.currentGroupPv - (a.currentPersonalPv + a.currentGroupPv),
      );
  });

export const getPvDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<PvDetail> => {
    await assertPvAccess(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profile }, { data: history }, { data: transactions }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("id", data.userId).maybeSingle(),
      supabaseAdmin
        .from("pv_period_history")
        .select("period_month, personal_pv, group_pv, rank_key")
        .eq("user_id", data.userId)
        .order("period_month", { ascending: false })
        .limit(24),
      supabaseAdmin
        .from("pv_transactions")
        .select("id, type, pv_amount, level, period_month, created_at, source_user_id")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const sourceIds = [
      ...new Set((transactions ?? []).map((t) => t.source_user_id).filter(Boolean) as string[]),
    ];
    const { data: sources } = sourceIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, username").in("id", sourceIds)
      : { data: [] as { id: string; full_name: string; username: string | null }[] };
    const names = new Map((sources ?? []).map((s) => [s.id, s.username ?? s.full_name]));

    return {
      userId: data.userId,
      fullName: profile?.full_name ?? "Member",
      history: (history ?? []).map((h) => ({
        periodMonth: h.period_month,
        personalPv: h.personal_pv,
        groupPv: h.group_pv,
        rankKey: h.rank_key,
      })),
      transactions: (transactions ?? []).map((t) => ({
        id: t.id,
        type: t.type,
        pvAmount: t.pv_amount,
        level: t.level,
        periodMonth: t.period_month,
        createdAt: t.created_at,
        sourceName: t.source_user_id ? (names.get(t.source_user_id) ?? null) : null,
      })),
    };
  });
