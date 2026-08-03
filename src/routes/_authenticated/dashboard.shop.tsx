import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Minus, Plus, ShoppingCart, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addToCart,
  getCart,
  listProducts,
  placeOrder,
  setCartQuantity,
  INSUFFICIENT_BALANCE,
} from "@/lib/commerce.functions";
import { getWalletSnapshot } from "@/lib/wallet.functions";
import { money } from "@/lib/format";

type Tab = "catalogue" | "cart" | "checkout";

export const Route = createFileRoute("/_authenticated/dashboard/shop")({
  head: () => ({
    meta: [
      { title: "Shop — KM Prime Dashboard" },
      {
        name: "description",
        content: "Browse KM Prime products, manage your cart and check out from your member dashboard.",
      },
    ],
  }),
  component: DashboardShopPage,
});

function DashboardShopPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  const fetchCart = useServerFn(getCart);
  const { data: lines } = useQuery({ queryKey: ["cart"], queryFn: () => fetchCart() });
  const cartCount = (lines ?? []).reduce((sum, l) => sum + l.quantity, 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "catalogue", label: "Catalogue" },
    { key: "cart", label: cartCount > 0 ? `Cart (${cartCount})` : "Cart" },
    { key: "checkout", label: "Checkout" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={
              tab === item.key
                ? "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                : "rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "catalogue" && <CatalogueTab onViewCart={() => setTab("cart")} />}
      {tab === "cart" && (
        <CartTab onBrowse={() => setTab("catalogue")} onCheckout={() => setTab("checkout")} />
      )}
      {tab === "checkout" && <CheckoutTab onBrowse={() => setTab("catalogue")} />}
    </div>
  );
}

function CatalogueTab({ onViewCart }: { onViewCart: () => void }) {
  const fetchProducts = useServerFn(listProducts);
  const add = useServerFn(addToCart);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  });

  const mutation = useMutation({
    mutationFn: (productId: string) => add({ data: { productId, quantity: 1 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to your cart");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard
      title="Product catalogue"
      description="Every product carries a point value that counts toward your personal and group volume."
      action={
        <Button variant="primeGhost" size="sm" onClick={onViewCart}>
          <ShoppingCart className="mr-1.5 size-4" /> View cart
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the catalogue…</p>
      ) : (products ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No products are available right now.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(products ?? []).map((product) => (
            <article
              key={product.id}
              className="flex flex-col rounded-2xl border border-border bg-background p-5"
            >
              <Link
                to="/shop/$slug"
                params={{ slug: product.slug }}
                className="grid place-items-center rounded-xl bg-secondary/60 p-4"
              >
                <img
                  src={product.images[0] ?? "/products/product-1.jpg"}
                  alt={product.name}
                  loading="lazy"
                  className="h-32 w-auto object-contain"
                />
              </Link>
              <span className="eyebrow mt-4">{product.category}</span>
              <Link
                to="/shop/$slug"
                params={{ slug: product.slug }}
                className="mt-2 text-base font-bold text-foreground hover:text-primary"
              >
                {product.name}
              </Link>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  {money(product.retailPriceCents)}
                </span>
                <span className="text-lg font-extrabold text-primary">
                  {money(product.priceCents)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Member price • {product.pv} PV
                {product.stockQuantity <= 0 && " • Out of stock"}
              </p>
              <div className="mt-auto flex gap-2 pt-5">
                <Button
                  variant="prime"
                  size="sm"
                  className="flex-1"
                  disabled={product.stockQuantity <= 0 || mutation.isPending}
                  onClick={() => mutation.mutate(product.id)}
                >
                  Add to cart
                </Button>
                <Button asChild variant="primeGhost" size="sm">
                  <Link to="/shop/$slug" params={{ slug: product.slug }}>
                    View
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

function CartTab({ onBrowse, onCheckout }: { onBrowse: () => void; onCheckout: () => void }) {
  const fetchCart = useServerFn(getCart);
  const updateQuantity = useServerFn(setCartQuantity);
  const queryClient = useQueryClient();

  const { data: lines, isLoading } = useQuery({ queryKey: ["cart"], queryFn: () => fetchCart() });

  const mutate = useMutation({
    mutationFn: (input: { itemId: string; quantity: number }) => updateQuantity({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const items = lines ?? [];
  const subtotal = items.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
  const retail = items.reduce((sum, l) => sum + l.product.retailPriceCents * l.quantity, 0);
  const pv = items.reduce((sum, l) => sum + l.product.pv * l.quantity, 0);

  return (
    <PanelCard title="Your cart" description="Adjust quantities before you check out.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your cart…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Button variant="prime" className="mt-5" onClick={onBrowse}>
            Browse the catalogue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((line) => (
            <article
              key={line.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background p-4"
            >
              <div className="grid size-20 place-items-center rounded-xl bg-secondary/60 p-2">
                <img
                  src={line.product.images[0] ?? "/products/product-1.jpg"}
                  alt={line.product.name}
                  className="h-full w-auto object-contain"
                />
              </div>
              <div className="min-w-[9rem] flex-1">
                <Link
                  to="/shop/$slug"
                  params={{ slug: line.product.slug }}
                  className="text-sm font-bold text-foreground hover:text-primary"
                >
                  {line.product.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {line.product.pv * line.quantity} PV •{" "}
                  <span className="font-bold text-primary">{money(line.product.priceCents)}</span>
                </p>
              </div>
              <div className="flex items-center rounded-xl border border-border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="grid size-9 place-items-center text-muted-foreground"
                  onClick={() => mutate.mutate({ itemId: line.id, quantity: line.quantity - 1 })}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-9 text-center text-sm font-bold">{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="grid size-9 place-items-center text-muted-foreground"
                  onClick={() => mutate.mutate({ itemId: line.id, quantity: line.quantity + 1 })}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <p className="w-20 text-right text-sm font-extrabold text-foreground">
                {money(line.product.priceCents * line.quantity)}
              </p>
              <button
                type="button"
                aria-label={`Remove ${line.product.name}`}
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => mutate.mutate({ itemId: line.id, quantity: 0 })}
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          ))}

          <dl className="space-y-2 rounded-2xl border border-border bg-background p-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Retail value</dt>
              <dd className="line-through">{money(retail)}</dd>
            </div>
            <div className="flex justify-between text-primary">
              <dt className="font-semibold">Member savings</dt>
              <dd className="font-semibold">-{money(retail - subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Point value earned</dt>
              <dd>{pv} PV</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-foreground">
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3">
            <Button variant="prime" size="lg" onClick={onCheckout}>
              Continue to checkout
            </Button>
            <Button variant="primeGhost" size="lg" onClick={onBrowse}>
              Keep shopping
            </Button>
          </div>
        </div>
      )}
    </PanelCard>
  );
}

function CheckoutTab({ onBrowse }: { onBrowse: () => void }) {
  const fetchCart = useServerFn(getCart);
  const fetchWallet = useServerFn(getWalletSnapshot);
  const submitOrder = useServerFn(placeOrder);
  const queryClient = useQueryClient();

  const [placed, setPlaced] = useState<{ reference: string } | null>(null);
  const [insufficient, setInsufficient] = useState(false);
  const [pendingForm, setPendingForm] = useState<Record<string, string> | null>(null);

  const { data: lines } = useQuery({ queryKey: ["cart"], queryFn: () => fetchCart() });
  const { data: wallet } = useQuery({ queryKey: ["wallet-snapshot"], queryFn: () => fetchWallet() });

  const items = lines ?? [];
  const subtotal = items.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
  const pv = items.reduce((sum, l) => sum + l.product.pv * l.quantity, 0);
  const balance = wallet?.balanceCents ?? 0;
  const shortfall = Math.max(0, subtotal - balance);

  const mutation = useMutation({
    mutationFn: (form: Record<string, string>) =>
      submitOrder({
        data: {
          fullName: form["fullName"] ?? "",
          phone: form["phone"] ?? "",
          addressLine1: form["addressLine1"] ?? "",
          addressLine2: form["addressLine2"] || undefined,
          city: form["city"] ?? "",
          state: form["state"] || undefined,
          postalCode: form["postalCode"] ?? "",
          country: form["country"] ?? "",
        },
      }),
    onSuccess: (result) => {
      setInsufficient(false);
      setPendingForm(null);
      setPlaced(result);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
    },
    onError: (error: Error) => {
      setPendingForm(null);
      if (error.message.includes(INSUFFICIENT_BALANCE)) {
        setInsufficient(true);
        toast.error("Insufficient balance. Please deposit funds to continue.");
        return;
      }
      toast.error(error.message);
    },
  });

  if (placed) {
    return (
      <PanelCard title="Order placed" description="Paid from your member wallet.">
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-2xl font-extrabold text-foreground">
            Order {placed.reference} received
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Point value has been credited to this cycle. Track shipping and confirm delivery from
            your orders page.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="prime">
              <Link to="/dashboard/orders">View my orders</Link>
            </Button>
            <Button variant="primeGhost" onClick={() => setPlaced(null)}>
              Keep shopping
            </Button>
          </div>
        </div>
      </PanelCard>
    );
  }

  if (items.length === 0) {
    return (
      <PanelCard title="Checkout" description="Add products to your cart to check out.">
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Button variant="prime" className="mt-5" onClick={onBrowse}>
            Browse the catalogue
          </Button>
        </div>
      </PanelCard>
    );
  }

  return (
    <>
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          const entries = Object.fromEntries(
            new FormData(event.currentTarget).entries(),
          ) as Record<string, string>;
          setPendingForm(entries);
        }}
      >
        <PanelCard title="Shipping details" description="Where should we deliver this order?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label="Full name" required />
            <Field name="phone" label="Phone number" required />
            <Field name="addressLine1" label="Address line 1" required className="sm:col-span-2" />
            <Field name="addressLine2" label="Address line 2 (optional)" className="sm:col-span-2" />
            <Field name="city" label="City" required />
            <Field name="state" label="State / region" />
            <Field name="postalCode" label="Postal code" required />
            <Field name="country" label="Country" required />
          </div>
        </PanelCard>

        <PanelCard title="Payment & summary" description="Orders are paid from your member wallet.">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-5">
            <Wallet className="size-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">Member wallet</p>
              <p className="text-xs text-muted-foreground">
                Available balance {money(balance)} — top up from the wallet page.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm">
            {items.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {line.product.name} × {line.quantity}
                </span>
                <span className="font-semibold">
                  {money(line.product.priceCents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Point value earned</dt>
              <dd className="font-semibold text-primary">{pv} PV</dd>
            </div>
            <div className="flex justify-between text-base font-extrabold text-foreground">
              <dt>Total</dt>
              <dd>{money(subtotal)}</dd>
            </div>
          </dl>

          {(insufficient || shortfall > 0) && (
            <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive">
                Insufficient balance. Please deposit funds to continue.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You need {money(shortfall)} more to complete this order.
              </p>
              <Button asChild variant="prime" size="sm" className="mt-3">
                <Link to="/dashboard/wallet">Deposit Now</Link>
              </Button>
            </div>
          )}

          <Button
            type="submit"
            variant="prime"
            size="lg"
            className="mt-6 w-full"
            disabled={mutation.isPending || shortfall > 0}
          >
            {mutation.isPending ? "Placing order…" : "Review & pay from wallet"}
          </Button>
        </PanelCard>
      </form>

      <Dialog
        open={pendingForm !== null}
        onOpenChange={(next) => {
          if (!next && !mutation.isPending) setPendingForm(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm your purchase</DialogTitle>
            <DialogDescription>
              Review your order before it is paid from your wallet. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 text-sm">
            {items.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {line.product.name} × {line.quantity}
                </span>
                <span className="font-semibold">
                  {money(line.product.priceCents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Point value earned</dt>
              <dd className="font-semibold text-primary">{pv} PV</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Wallet balance after</dt>
              <dd>{money(Math.max(0, balance - subtotal))}</dd>
            </div>
            <div className="flex justify-between text-base font-extrabold text-foreground">
              <dt>Total charged</dt>
              <dd>{money(subtotal)}</dd>
            </div>
          </dl>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setPendingForm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="prime"
              disabled={mutation.isPending}
              onClick={() => pendingForm && mutation.mutate(pendingForm)}
            >
              {mutation.isPending ? "Processing…" : "Confirm purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  name,
  label,
  required,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={`shop-${name}`}>{label}</Label>
      <Input id={`shop-${name}`} name={name} required={required} className="mt-2" maxLength={160} />
    </div>
  );
}
