import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { getCart, setCartQuantity } from "@/lib/commerce.functions";
import { money } from "@/lib/format";

const title = "Your Cart — KM Prime";
const description = "Review your KM Prime order, member savings and point value before checkout.";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const fetchCart = useServerFn(getCart);
  const updateQuantity = useServerFn(setCartQuantity);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="section-shell py-14">
        <span className="eyebrow">Cart</span>
        <h1 className="mt-5 text-4xl">Your cart</h1>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading your cart…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="prime" className="mt-5">
              <Link to="/shop">Browse the catalogue</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              {items.map((line) => (
                <article
                  key={line.id}
                  className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="grid size-24 place-items-center rounded-xl bg-secondary/60 p-3">
                    <img
                      src={line.product.images[0] ?? "/products/product-1.jpg"}
                      alt={line.product.name}
                      className="h-full w-auto object-contain"
                    />
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <Link
                      to="/shop/$slug"
                      params={{ slug: line.product.slug }}
                      className="text-base font-bold text-foreground hover:text-primary"
                    >
                      {line.product.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.product.pv * line.quantity} PV •{" "}
                      <span className="line-through">{money(line.product.retailPriceCents)}</span>{" "}
                      <span className="font-bold text-primary">
                        {money(line.product.priceCents)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center rounded-xl border border-border">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="grid size-9 place-items-center text-muted-foreground"
                      onClick={() =>
                        mutate.mutate({ itemId: line.id, quantity: line.quantity - 1 })
                      }
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="grid size-9 place-items-center text-muted-foreground"
                      onClick={() =>
                        mutate.mutate({ itemId: line.id, quantity: line.quantity + 1 })
                      }
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="w-20 text-right text-base font-extrabold text-foreground">
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
            </div>

            <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-xl">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
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
              <Button
                variant="prime"
                size="lg"
                className="mt-6 w-full"
                onClick={() => navigate({ to: "/checkout" })}
              >
                Proceed to checkout
              </Button>
              <Button asChild variant="primeGhost" className="mt-3 w-full">
                <Link to="/shop">Keep shopping</Link>
              </Button>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
