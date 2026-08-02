import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminAccess = {
  roles: string[];
  permissions: string[];
  isStaff: boolean;
};

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAccess> => {
    const { supabase, userId } = context;
    const [{ data: roles }, { data: rolePerms }, { data: overrides }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("role_permissions").select("role, permission_key, granted"),
      supabase.from("user_permission_overrides").select("permission_key, granted").eq("user_id", userId),
    ]);

    const roleKeys = (roles ?? []).map((r) => r.role as string);
    const granted = new Set<string>();
    if (roleKeys.includes("super_admin")) {
      for (const row of rolePerms ?? []) granted.add(row.permission_key);
      granted.add("*");
    } else {
      for (const row of rolePerms ?? []) {
        if (row.granted && roleKeys.includes(row.role as string)) granted.add(row.permission_key);
      }
    }
    for (const row of overrides ?? []) {
      if (row.granted) granted.add(row.permission_key);
      else granted.delete(row.permission_key);
    }

    return {
      roles: roleKeys,
      permissions: [...granted],
      isStaff: roleKeys.length > 0,
    };
  });

export type AdminStats = {
  active_members: number;
  total_members: number;
  licensed_members: number;
  total_pv: number;
  commissions_paid_cents: number;
  commissions_held_cents: number;
  revenue_cents: number;
  orders_count: number;
  pending_kyc: number;
  pending_withdrawals: number;
  revenue_by_month: { month: string; revenue_cents: number; orders: number }[];
};

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_report_stats");
    if (error) throw new Error(error.message);
    return data as unknown as AdminStats;
  });

export const listAdminMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ search: z.string().max(120).default("") }).parse(data))
  .handler(async ({ context, data }) => {
    let query = context.supabase
      .from("profiles")
      .select("id, full_name, email, username, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const term = data.search.trim();
    if (term) {
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`,
      );
    }
    const { data: profiles, error } = await query;
    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];

    const [{ data: members }, { data: wallets }] = await Promise.all([
      context.supabase
        .from("members")
        .select("id, status, license_status, license_expiry_date, rank_key")
        .in("id", ids),
      context.supabase.from("wallets").select("user_id, balance_cents, frozen").in("user_id", ids),
    ]);

    return (profiles ?? []).map((profile) => {
      const member = (members ?? []).find((m) => m.id === profile.id);
      const wallet = (wallets ?? []).find((w) => w.user_id === profile.id);
      return {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        username: profile.username,
        phone: profile.phone,
        status: member?.status ?? "pending",
        licenseStatus: member?.license_status ?? "inactive",
        licenseExpiry: member?.license_expiry_date ?? null,
        rankKey: member?.rank_key ?? "member",
        balanceCents: wallet?.balance_cents ?? 0,
        frozen: wallet?.frozen ?? false,
      };
    });
  });

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        amountCents: z.number().int().min(-1_000_000).max(1_000_000),
        note: z.string().trim().min(3).max(200),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_adjust_wallet", {
      _user_id: data.userId,
      _amount_cents: data.amountCents,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetWalletFrozen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), frozen: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_wallet_frozen", {
      _user_id: data.userId,
      _frozen: data.frozen,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ userId: z.string().uuid(), status: z.enum(["pending", "active", "inactive"]) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_member_status", {
      _user_id: data.userId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listKycQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ status: z.enum(["pending", "approved", "rejected"]).default("pending") })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("kyc_submissions")
      .select(
        "id, user_id, status, document_type, id_document_path, selfie_path, address_proof_path, rejection_reason, submitted_at",
      )
      .eq("status", data.status)
      .order("submitted_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] };

    return (rows ?? []).map((row) => {
      const profile = (profiles ?? []).find((p) => p.id === row.user_id);
      return {
        ...row,
        fullName: profile?.full_name ?? "Member",
        email: profile?.email ?? "",
      };
    });
  });

export const adminReviewKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_review_kyc", {
      _user_id: data.userId,
      _approve: data.approve,
      _reason: data.reason ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWithdrawalQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ status: z.enum(["pending", "approved", "rejected", "paid"]).default("pending") })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("withdrawal_requests")
      .select("id, user_id, amount_cents, method, destination, status, admin_note, created_at")
      .eq("status", data.status)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] };

    return (rows ?? []).map((row) => {
      const profile = (profiles ?? []).find((p) => p.id === row.user_id);
      return { ...row, fullName: profile?.full_name ?? "Member", email: profile?.email ?? "" };
    });
  });

export const adminReviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_review_withdrawal", {
      _id: data.id,
      _approve: data.approve,
      _note: data.note ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select(
        "id, slug, name, description, category, retail_price_cents, price_cents, pv, images, stock_quantity, status",
      )
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        slug: z.string().trim().min(2).max(80),
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(1000).default(""),
        category: z.string().trim().min(2).max(60),
        retailPriceCents: z.number().int().min(0).max(10_000_00),
        priceCents: z.number().int().min(0).max(10_000_00),
        pv: z.number().int().min(0).max(10_000),
        images: z.array(z.string().max(400)).max(6).default([]),
        stockQuantity: z.number().int().min(0).max(1_000_000),
        status: z.enum(["active", "inactive"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_upsert_product", {
      _id: data.id,
      _slug: data.slug,
      _name: data.name,
      _description: data.description,
      _category: data.category,
      _retail_price_cents: data.retailPriceCents,
      _price_cents: data.priceCents,
      _pv: data.pv,
      _images: data.images,
      _stock_quantity: data.stockQuantity,
      _status: data.status,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid(), stock: z.number().int().min(0).max(1_000_000) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_stock", {
      _product_id: data.productId,
      _stock_quantity: data.stock,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, reference, user_id, status, payment_method, payment_state, total_cents, total_pv, full_name, city, country, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data ?? [];
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum([
          "pending_payment",
          "awaiting_approval",
          "paid",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_order_status", {
      _order_id: data.orderId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("commissions")
      .select("id, user_id, type, status, amount_cents, volume, period_month, note, credited_at")
      .order("period_month", { ascending: false })
      .limit(80);
    if (error) throw error;

    const ids = [...new Set((data ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] };

    return (data ?? []).map((row) => ({
      ...row,
      fullName: (profiles ?? []).find((p) => p.id === row.user_id)?.full_name ?? "Member",
    }));
  });

export const adminSetCommissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["paid", "held"]),
        amountCents: z.number().int().min(0).max(10_000_00).nullable().default(null),
        note: z.string().trim().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_commission_status", {
      _commission_id: data.id,
      _status: data.status,
      _amount_cents: data.amountCents,
      _note: data.note,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateRank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        key: z.string().min(2).max(40),
        minPersonalPv: z.number().int().min(0).max(1_000_000),
        minGroupPv: z.number().int().min(0).max(10_000_000),
        minActiveDirects: z.number().int().min(0).max(1000),
        unlockedLevels: z.number().int().min(1).max(15),
        leadershipShare: z.number().min(0).max(100),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_update_rank", {
      _key: data.key,
      _min_personal_pv: data.minPersonalPv,
      _min_group_pv: data.minGroupPv,
      _min_active_directs: data.minActiveDirects,
      _unlocked_levels: data.unlockedLevels,
      _leadership_share: data.leadershipShare,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id, title, body, published, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        title: z.string().trim().min(3).max(140),
        body: z.string().trim().min(3).max(4000),
        published: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_upsert_announcement", {
      _id: data.id,
      _title: data.title,
      _body: data.body,
      _published: data.published,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminGallery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("gallery_features")
      .select("id, display_name, rank_key, caption, photo_url, visible, sort_order")
      .order("sort_order")
      .limit(60);
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertGalleryFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        displayName: z.string().trim().min(2).max(120),
        rankKey: z.string().trim().max(40).nullable().default(null),
        caption: z.string().trim().max(300).nullable().default(null),
        photoUrl: z.string().trim().url().max(500),
        visible: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_upsert_gallery_feature", {
      _id: data.id,
      _display_name: data.displayName,
      _rank_key: data.rankKey,
      _caption: data.caption,
      _photo_url: data.photoUrl,
      _visible: data.visible,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles }, { data: rolePerms }, { data: overrides }] = await Promise.all([
      context.supabase.from("user_roles").select("user_id, role, created_at"),
      context.supabase.from("role_permissions").select("role, permission_key, granted"),
      context.supabase.from("user_permission_overrides").select("user_id, permission_key, granted"),
    ]);

    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] };

    return {
      rolePermissions: rolePerms ?? [],
      overrides: overrides ?? [],
      staff: ids.map((id) => {
        const profile = (profiles ?? []).find((p) => p.id === id);
        return {
          userId: id,
          fullName: profile?.full_name ?? "Member",
          email: profile?.email ?? "",
          roles: (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role as string),
        };
      }),
    };
  });

export const adminAssignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["super_admin", "manager", "mini_admin", "stockist"]),
        enabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_assign_role", {
      _user_id: data.userId,
      _role: data.role,
      _enabled: data.enabled,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        role: z.enum(["super_admin", "manager", "mini_admin", "stockist"]),
        key: z.string().min(3).max(60),
        granted: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_role_permission", {
      _role: data.role,
      _key: data.key,
      _granted: data.granted,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ userId: z.string().uuid(), key: z.string().min(3).max(60), granted: z.boolean() })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_user_permission", {
      _user_id: data.userId,
      _key: data.key,
      _granted: data.granted,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
