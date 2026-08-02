import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MatrixNode = {
  positionId: string;
  userId: string;
  username: string;
  level: number;
  slot: "left" | "right" | null;
  active: boolean;
  children: MatrixNode[];
};

export type MemberOverview = {
  membershipStatus: "pending" | "active" | "inactive";
  licenseStatus: "active" | "inactive" | "grace_period";
  licenseExpiryDate: string | null;
  graceStartedAt: string | null;
  graceDaysLeft: number | null;
  rank: { key: string; name: string; unlockedLevels: number };
  activeDirects: number;
  qualified: boolean;
  matrixVolume: number;
  wallet: { paidCents: number; heldCents: number };
  placed: boolean;
};

const MATRIX_DEPTH = 15;

export const getMemberOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberOverview> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: member }, { data: directs }, { data: commissions }, { data: position }] =
      await Promise.all([
        supabase
          .from("members")
          .select("status, license_status, license_expiry_date, grace_started_at, rank_key")
          .eq("id", userId)
          .maybeSingle(),
        supabaseAdmin
          .from("profiles")
          .select("id, members!inner(status, license_status)")
          .eq("referrer_id", userId),
        supabase.from("commissions").select("status, amount_cents, volume"),
        supabase.from("matrix_positions").select("id").eq("user_id", userId).maybeSingle(),
      ]);

    const rankKey = member?.rank_key ?? "member";
    const { data: rank } = await supabaseAdmin
      .from("ranks")
      .select("key, name, unlocked_levels")
      .eq("key", rankKey)
      .maybeSingle();

    const activeDirects = (directs ?? []).filter((row) => {
      const m = row.members as unknown as { status: string; license_status: string } | null;
      return m?.status === "active" && m?.license_status === "active";
    }).length;

    const licenseStatus = member?.license_status ?? "inactive";
    const membershipStatus = member?.status ?? "pending";
    const qualified = membershipStatus === "active" && licenseStatus === "active" && activeDirects >= 2;

    let graceDaysLeft: number | null = null;
    if (licenseStatus === "grace_period" && member?.grace_started_at) {
      const elapsed = Math.floor(
        (Date.now() - new Date(member.grace_started_at).getTime()) / 86_400_000,
      );
      graceDaysLeft = Math.max(0, 7 - elapsed);
    }

    const paidCents = (commissions ?? [])
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount_cents, 0);
    const heldCents = (commissions ?? [])
      .filter((c) => c.status === "held")
      .reduce((sum, c) => sum + c.amount_cents, 0);
    const matrixVolume = (commissions ?? []).reduce((max, c) => Math.max(max, c.volume), 0);

    return {
      membershipStatus: membershipStatus as MemberOverview["membershipStatus"],
      licenseStatus: licenseStatus as MemberOverview["licenseStatus"],
      licenseExpiryDate: member?.license_expiry_date ?? null,
      graceStartedAt: member?.grace_started_at ?? null,
      graceDaysLeft,
      rank: {
        key: rank?.key ?? "member",
        name: rank?.name ?? "Member",
        unlockedLevels: rank?.unlocked_levels ?? 2,
      },
      activeDirects,
      qualified,
      matrixVolume,
      wallet: { paidCents, heldCents },
      placed: Boolean(position?.id),
    };
  });

export const getMatrixTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ root: MatrixNode | null; depth: number }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: root } = await supabaseAdmin
      .from("matrix_positions")
      .select("id, user_id, slot, level")
      .eq("user_id", userId)
      .maybeSingle();

    if (!root) return { root: null, depth: MATRIX_DEPTH };

    type Row = { id: string; user_id: string; slot: string | null; level: number };
    const collected: Row[] = [];
    let frontier = [root.id];
    let depth = 0;

    while (frontier.length > 0 && depth < 4) {
      const { data } = await supabaseAdmin
        .from("matrix_positions")
        .select("id, user_id, slot, level")
        .in("parent_position_id", frontier);
      const rows = (data ?? []) as Row[];
      collected.push(...rows);
      frontier = rows.map((r) => r.id);
      depth += 1;
    }

    const ids = [root.user_id, ...collected.map((r) => r.user_id)];
    const [{ data: profiles }, { data: members }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username").in("id", ids),
      supabaseAdmin.from("members").select("id, status, license_status").in("id", ids),
    ]);

    const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.username ?? "member"]));
    const activeOf = new Map(
      (members ?? []).map((m) => [m.id, m.status === "active" && m.license_status === "active"]),
    );

    const { data: edges } = await supabaseAdmin
      .from("matrix_positions")
      .select("id, parent_position_id")
      .in("id", collected.map((r) => r.id).concat(root.id));
    const parentOf = new Map((edges ?? []).map((e) => [e.id, e.parent_position_id]));

    const nodeOf = (row: Row): MatrixNode => ({
      positionId: row.id,
      userId: row.user_id,
      username: nameOf.get(row.user_id) ?? "member",
      level: row.level - root.level,
      slot: (row.slot as "left" | "right" | null) ?? null,
      active: activeOf.get(row.user_id) ?? false,
      children: [],
    });

    const nodes = new Map<string, MatrixNode>();
    const rootNode = nodeOf(root as Row);
    nodes.set(root.id, rootNode);
    for (const row of collected) nodes.set(row.id, nodeOf(row));
    for (const row of collected) {
      const parent = nodes.get(parentOf.get(row.id) ?? "");
      if (parent) parent.children.push(nodes.get(row.id)!);
    }
    for (const node of nodes.values()) {
      node.children.sort((a, b) => (a.slot === "left" ? -1 : b.slot === "left" ? 1 : 0));
    }

    return { root: rootNode, depth: MATRIX_DEPTH };
  });

export const getWalletLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("commissions")
      .select("id, type, status, amount_cents, volume, period_month, note")
      .order("period_month", { ascending: false })
      .limit(24);
    if (error) throw error;
    return data ?? [];
  });

export const getLicensePayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("license_payments")
      .select("id, kind, amount_cents, period_start, period_end, paid_at")
      .order("paid_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    return data ?? [];
  });

/** Records the $65 package + $10 first licence payment and places the member in the matrix. */
export const activateMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("activate_member", { _user_id: context.userId });
    if (error) throw error;
    return { ok: true };
  });

/** Records a $10 monthly licence payment; late payers re-enter at the next open matrix slot. */
export const payLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("pay_license", { _user_id: context.userId });
    if (error) throw error;
    return { ok: true };
  });
