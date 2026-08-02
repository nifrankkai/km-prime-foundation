import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  retailPriceCents: number;
  priceCents: number;
  pv: number;
  images: string[];
  stockQuantity: number;
};

export type CartLine = {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
};

export type OrderSummary = {
  id: string;
  reference: string;
  status: string;
  paymentMethod: string;
  paymentState: string;
  totalCents: number;
  totalPv: number;
  createdAt: string;
  deliveredAt: string | null;
  items: { id: string; name: string; image: string | null; quantity: number; unitPriceCents: number; pv: number }[];
};

const PRODUCT_COLUMNS =
  "id, slug, name, description, category, retail_price_cents, price_cents, pv, images, stock_quantity";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  retail_price_cents: number;
  price_cents: number;
  pv: number;
  images: string[] | null;
  stock_quantity: number;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    retailPriceCents: row.retail_price_cents,
    priceCents: row.price_cents,
    pv: row.pv,
    images: row.images ?? [],
    stockQuantity: row.stock_quantity,
  };
}

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { data, error } = await publicClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ProductRow[]).map(toProduct);
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Product | null> => {
    const { data: row, error } = await publicClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return row ? toProduct(row as ProductRow) : null;
  });

export const getCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CartLine[]> => {
    const { data, error } = await context.supabase
      .from("cart_items")
      .select(`id, product_id, quantity, products (${PRODUCT_COLUMNS})`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? [])
      .filter((row) => row.products)
      .map((row) => ({
        id: row.id as string,
        productId: row.product_id as string,
        quantity: row.quantity as number,
        product: toProduct(row.products as unknown as ProductRow),
      }));
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("cart_items")
        .update({ quantity: Math.min(99, existing.quantity + data.quantity) })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true };
    }

    const { error } = await context.supabase
      .from("cart_items")
      .insert({ user_id: context.userId, product_id: data.productId, quantity: data.quantity });
    if (error) throw error;
    return { ok: true };
  });

export const setCartQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ itemId: z.string().uuid(), quantity: z.number().int().min(0).max(99) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    if (data.quantity === 0) {
      const { error } = await context.supabase.from("cart_items").delete().eq("id", data.itemId);
      if (error) throw error;
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("cart_items")
      .update({ quantity: data.quantity })
      .eq("id", data.itemId);
    if (error) throw error;
    return { ok: true };
  });

export const PAYMENT_METHODS = [
  { value: "visa", label: "Visa", hint: "Card payment, confirmed instantly" },
  { value: "mastercard", label: "MasterCard", hint: "Card payment, confirmed instantly" },
  { value: "usdt", label: "USDT (TRC-20)", hint: "Crypto transfer, confirmed instantly" },
  { value: "mobile_money", label: "Mobile Money", hint: "Confirmed instantly" },
  { value: "bank_transfer", label: "Bank Transfer", hint: "Confirmed instantly" },
  { value: "manual", label: "Manual Payment", hint: "Reviewed by an admin before your order confirms" },
] as const;

const checkoutSchema = z.object({
  paymentMethod: z.enum(["visa", "mastercard", "usdt", "mobile_money", "bank_transfer", "manual"]),
  paymentReference: z.string().trim().max(120).optional(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  addressLine1: z.string().trim().min(3).max(160),
  addressLine2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(80),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: cart, error: cartError } = await supabase
      .from("cart_items")
      .select(`id, quantity, products (${PRODUCT_COLUMNS})`);
    if (cartError) throw cartError;
    const lines = (cart ?? []).filter((row) => row.products);
    if (lines.length === 0) throw new Error("Your cart is empty.");

    let subtotal = 0;
    let totalPv = 0;
    const items = lines.map((row) => {
      const product = toProduct(row.products as unknown as ProductRow);
      const quantity = row.quantity as number;
      subtotal += product.priceCents * quantity;
      totalPv += product.pv * quantity;
      return {
        product_id: product.id,
        name: product.name,
        image: product.images[0] ?? null,
        unit_price_cents: product.priceCents,
        pv: product.pv,
        quantity,
      };
    });

    const manual = data.paymentMethod === "manual";
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        payment_method: data.paymentMethod,
        payment_state: manual ? "pending_review" : "paid",
        status: manual ? "awaiting_approval" : "paid",
        payment_reference: data.paymentReference ?? null,
        subtotal_cents: subtotal,
        shipping_cents: 0,
        total_cents: subtotal,
        total_pv: totalPv,
        full_name: data.fullName,
        phone: data.phone,
        address_line1: data.addressLine1,
        address_line2: data.addressLine2 ?? null,
        city: data.city,
        state: data.state ?? null,
        postal_code: data.postalCode,
        country: data.country,
      })
      .select("id, reference")
      .single();
    if (error) throw error;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw itemsError;

    await supabase.from("cart_items").delete().eq("user_id", userId);

    return { reference: order.reference as string, manual };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderSummary[]> => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, reference, status, payment_method, payment_state, total_cents, total_pv, created_at, delivered_at, order_items (id, name, image, quantity, unit_price_cents, pv)",
      )
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      reference: row.reference as string,
      status: row.status as string,
      paymentMethod: row.payment_method as string,
      paymentState: row.payment_state as string,
      totalCents: row.total_cents as number,
      totalPv: row.total_pv as number,
      createdAt: row.created_at as string,
      deliveredAt: (row.delivered_at as string | null) ?? null,
      items: ((row.order_items ?? []) as OrderSummary["items"]).map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents ?? (item as unknown as { unit_price_cents: number }).unit_price_cents,
        pv: item.pv,
      })),
    }));
  });

export const confirmOrderReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("confirm_order_received", { _order_id: data.orderId });
    if (error) throw error;
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });
