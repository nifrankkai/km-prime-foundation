import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCart, placeOrder, INSUFFICIENT_BALANCE } from "@/lib/commerce.functions";
import { getWalletSnapshot } from "@/lib/wallet.functions";
import { money } from "@/lib/format";

const title = "Checkout — KM Prime";
const description = "Complete your KM Prime order using your member wallet balance.";

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

function CheckoutPage() {
  const fetchCart = useServerFn(getCart);
  const fetchWallet = useServerFn(getWalletSnapshot);
  const submitOrder = useServerFn(placeOrder);
  const navigate = useNavigate();

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
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="section-shell py-20">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <h1 className="mt-5 text-3xl">Order {placed.reference} received</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Paid from your wallet balance. You can follow shipping progress and confirm delivery from
              your dashboard.
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
            const entries = Object.fromEntries(
              new FormData(event.currentTarget).entries(),
            ) as Record<string, string>;
            setPendingForm(entries);
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
              <h2 className="text-xl">Payment</h2>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-background p-5">
                <Wallet className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Member wallet</p>
                  <p className="text-xs text-muted-foreground">
                    Available balance {money(balance)} — top up from the deposit page.
                  </p>
                </div>
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
                  <span className="font-semibold">{money(line.product.priceCents * line.quantity)}</span>
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

            {(insufficient || (items.length > 0 && shortfall > 0)) && (
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
              disabled={mutation.isPending || items.length === 0 || shortfall > 0}
            >
              {mutation.isPending ? "Placing order…" : "Review & pay from wallet"}
            </Button>
            <Button asChild variant="primeGhost" className="mt-3 w-full">
              <Link to="/cart">Back to cart</Link>
            </Button>
          </aside>
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
