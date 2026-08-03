import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type Rank = {
  key: string;
  name: string;
  level: number;
  unlockedLevels: number;
  minPersonalPv: number;
  minGroupPv: number;
  minActiveDirects: number;
  leadershipQualified: boolean;
  leadershipShare: number;
};

export type CommissionRule = {
  key: string;
  name: string;
  commissionType: string;
  triggerCondition: Record<string, string | number | boolean>;
  payoutFormula: string;
  payoutFrequency: "weekly" | "monthly";
};

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const listRanks = createServerFn({ method: "GET" }).handler(async (): Promise<Rank[]> => {
  const { data, error } = await publicClient()
    .from("ranks")
    .select(
      "key, name, level, unlocked_levels, min_personal_pv, min_group_pv, min_active_directs, leadership_qualified, leadership_share",
    )
    .order("level", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    key: row.key,
    name: row.name,
    level: row.level,
    unlockedLevels: row.unlocked_levels,
    minPersonalPv: row.min_personal_pv,
    minGroupPv: row.min_group_pv,
    minActiveDirects: row.min_active_directs,
    leadershipQualified: row.leadership_qualified,
    leadershipShare: Number(row.leadership_share),
  }));
});

export const listCommissionRules = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommissionRule[]> => {
    const { data, error } = await publicClient()
      .from("commission_rules")
      .select("key, name, commission_type, trigger_condition, payout_formula, payout_frequency")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      key: row.key,
      name: row.name,
      commissionType: row.commission_type,
      triggerCondition: (row.trigger_condition ?? {}) as Record<string, string | number | boolean>,
      payoutFormula: row.payout_formula,
      payoutFrequency: row.payout_frequency as "weekly" | "monthly",
    }));
  },
);

export const getPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const month = (offset: number) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    };
    const periodMonth = month(0);

    const [{ data: pv }, { data: history }, { data: pvHistory }, { data: ledger }] =
      await Promise.all([
        context.supabase
          .from("pv_totals")
          .select("personal_pv, group_pv, period_month")
          .eq("period_month", periodMonth)
          .maybeSingle(),
        context.supabase
          .from("rank_history")
          .select("id, from_rank, to_rank, reason, direction, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        context.supabase
          .from("pv_period_history")
          .select("period_month, personal_pv, group_pv, rank_key")
          .order("period_month", { ascending: false })
          .limit(6),
        context.supabase
          .from("pv_transactions")
          .select("id, type, pv_amount, level, created_at")
          .eq("period_month", periodMonth)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    return {
      periodMonth,
      personalPv: pv?.personal_pv ?? 0,
      groupPv: pv?.group_pv ?? 0,
      rankHistory: history ?? [],
      pvHistory: pvHistory ?? [],
      recentPv: ledger ?? [],
    };
  });

