import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCart, placeOrder, PAYMENT_METHODS } from "@/lib/commerce.functions";
import { money } from "@/lib/format";

const title = "Checkout — KM Prime";
const description =
  "Complete your KM Prime order with card, USDT, mobile money, bank transfer or manual payment.";

export const Route = createFileRoute("/checkout")({
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
  component: CheckoutPage,
});

type Method = (typeof PAYMENT_METHODS)[number]["value"];

function CheckoutPage() {
  const fetchCart = useServerFn(getCart);
  const submitOrder = useServerFn(placeOrder);
  const navigate = useNavigate();

  const [method, setMethod] = useState<Method>("visa");
  const [placed, setPlaced] = useState<{ reference: string; manual: boolean } | null>(null);

  const { data: lines } = useQuery({ queryKey: ["cart"], queryFn: () => fetchCart() });
  const items = lines ?? [];
  const subtotal = items.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
  const pv = items.reduce((sum, l) => sum + l.product.pv * l.quantity, 0);

  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      submitOrder({
        data: {
          paymentMethod: method,
          paymentReference: String(form.get("paymentReference") ?? "") || undefined,
          fullName: String(form.get("fullName") ?? ""),
          phone: String(form.get("phone") ?? ""),
          addressLine1: String(form.get("addressLine1") ?? ""),
          addressLine2: String(form.get("addressLine2") ?? "") || undefined,
          city: String(form.get("city") ?? ""),
          state: String(form.get("state") ?? "") || undefined,
          postalCode: String(form.get("postalCode") ?? ""),
          country: String(form.get("country") ?? ""),
        },
      }),
    onSuccess: (result) => setPlaced(result),
    onError: (error: Error) => toast.error(error.message),
  });

  if (placed) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="section-shell py-20">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <h1 className="mt-5 text-3xl">Order {placed.reference} received</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              {placed.manual
                ? "Your manual payment is in the admin approval queue. The order confirms once an admin verifies it."
                : "Payment confirmed. You can follow shipping progress and confirm delivery from your dashboard."}
            </p>
            <Button variant="prime" className="mt-7" onClick={() => navigate({ to: "/dashboard/orders" })}>
              View my orders
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="section-shell py-14">
        <span className="eyebrow">Checkout</span>
        <h1 className="mt-5 text-4xl">Complete your order</h1>

        <form
          className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-xl">Shipping details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field name="fullName" label="Full name" required />
                <Field name="phone" label="Phone number" required />
                <Field name="addressLine1" label="Address line 1" required className="sm:col-span-2" />
                <Field name="addressLine2" label="Address line 2 (optional)" className="sm:col-span-2" />
                <Field name="city" label="City" required />
                <Field name="state" label="State / region" />
                <Field name="postalCode" label="Postal code" required />
                <Field name="country" label="Country" required />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-xl">Payment method</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMethod(option.value)}
                    className={
                      method === option.value
                        ? "rounded-xl border-2 border-primary bg-primary-soft/50 p-4 text-left"
                        : "rounded-xl border border-border bg-background p-4 text-left hover:border-primary/40"
                    }
                  >
                    <span className="block text-sm font-bold text-foreground">{option.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <Field
                  name="paymentReference"
                  label={
                    method === "manual"
                      ? "Payment reference / proof note (helps admin approval)"
                      : "Payment reference (optional)"
                  }
                />
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl">Order summary</h2>
            <ul className="mt-5 space-y-3 text-sm">
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
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Point value</dt>
                <dd>{pv} PV</dd>
              </div>
              <div className="flex justify-between text-base font-extrabold text-foreground">
                <dt>Total</dt>
                <dd>{money(subtotal)}</dd>
              </div>
            </dl>
            <Button
              type="submit"
              variant="prime"
              size="lg"
              className="mt-6 w-full"
              disabled={mutation.isPending || items.length === 0}
            >
              {mutation.isPending ? "Placing order…" : "Place order"}
            </Button>
            <Button asChild variant="primeGhost" className="mt-3 w-full">
              <Link to="/cart">Back to cart</Link>
            </Button>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
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
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required={required} className="mt-2" maxLength={160} />
    </div>
  );
}
