import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { addToCart, getProductBySlug } from "@/lib/commerce.functions";
import { money } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shop/$slug")({
  head: ({ params }) => {
    const name = params.slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    const title = `${name} — KM Prime`;
    const description = `Buy ${name} at KM Prime member pricing, with point value credited to your monthly volume.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductDetailPage,
});

const trust = [
  { icon: BadgeCheck, label: "Third-party tested every batch" },
  { icon: ShieldCheck, label: "90-day satisfaction guarantee" },
  { icon: Truck, label: "Ships within 2 business days" },
];

function ProductDetailPage() {
  const { slug } = useParams({ from: "/shop/$slug" });
  const navigate = useNavigate();
  const fetchProduct = useServerFn(getProductBySlug);
  const add = useServerFn(addToCart);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct({ data: { slug } }),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/login" });
        throw new Error("Sign in to add items to your cart.");
      }
      return add({ data: { productId: product!.id, quantity } });
    },
    onSuccess: () => {
      toast.success("Added to your cart");
      navigate({ to: "/cart" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="section-shell py-20 text-sm text-muted-foreground">Loading product…</main>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="section-shell py-20">
          <h1 className="text-3xl">Product not found</h1>
          <Button asChild variant="prime" className="mt-6">
            <Link to="/shop">Back to shop</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : ["/products/product-1.jpg"];
  const savings = product.retailPriceCents - product.priceCents;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="section-shell py-14">
        <nav className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">
            Shop
          </Link>{" "}
          / {product.category}
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex gap-4">
            <div className="flex flex-col gap-3">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={
                    index === activeImage
                      ? "grid size-20 place-items-center rounded-xl border-2 border-primary bg-secondary/50 p-2"
                      : "grid size-20 place-items-center rounded-xl border border-border bg-secondary/40 p-2"
                  }
                >
                  <img src={image} alt="" className="h-full w-auto object-contain" />
                </button>
              ))}
            </div>
            <div className="grid flex-1 place-items-center rounded-2xl border border-border bg-secondary/40 p-10">
              <img
                src={images[activeImage]}
                alt={product.name}
                width={900}
                height={900}
                className="shadow-float max-h-[26rem] w-auto object-contain"
              />
            </div>
          </div>

          <div>
            <span className="eyebrow">{product.category}</span>
            <h1 className="mt-4 text-4xl sm:text-5xl">{product.name}</h1>
            <p className="mt-5 text-muted-foreground">{product.description}</p>

            <div className="mt-7 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-baseline gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Retail price
                  </p>
                  <p className="text-xl font-bold text-muted-foreground line-through">
                    {money(product.retailPriceCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Member price
                  </p>
                  <p className="text-3xl font-extrabold text-primary">
                    {money(product.priceCents)}
                  </p>
                </div>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-deep">
                  Save {money(savings)} • {product.pv} PV
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center rounded-xl border border-border">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="grid size-10 place-items-center text-muted-foreground"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="grid size-10 place-items-center text-muted-foreground"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <Button
                  variant="prime"
                  size="lg"
                  disabled={addMutation.isPending || product.stockQuantity < 1}
                  onClick={() => addMutation.mutate()}
                >
                  <ShoppingCart />
                  {product.stockQuantity < 1 ? "Out of stock" : "Add to cart"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {product.stockQuantity} in stock • member pricing requires an active membership
              </p>
            </div>

            <ul className="mt-7 space-y-3">
              {trust.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm text-foreground">
                  <item.icon className="size-4 text-primary" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section className="mt-16 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <span className="eyebrow">Product details</span>
            <h2 className="mt-4 text-2xl sm:text-3xl">About {product.name}</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>{product.description}</p>
              <p>
                Every batch of {product.name} is produced in a GMP-certified facility and released
                only after third-party laboratory verification for potency, purity and heavy
                metals. We publish the certificate of analysis for each lot, so you always know
                exactly what is inside the bottle you receive.
              </p>
              <p>
                Formulated for daily use, this {product.category.toLowerCase()} product is designed
                to fit an ordinary routine rather than a complicated regimen. Take it consistently
                for best results, and store it in a cool, dry place away from direct sunlight.
              </p>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">How to use</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Follow the serving guidance on the label, ideally at the same time each day with
                  food and a full glass of water.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Good to know</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Not intended to diagnose, treat or cure any condition. Consult your doctor if you
                  are pregnant, nursing or on prescription medication.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-secondary/40 p-8">
            <h3 className="text-lg">At a glance</h3>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-semibold text-foreground">{product.category}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Point value</dt>
                <dd className="font-semibold text-foreground">{product.pv} PV</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Member saving</dt>
                <dd className="font-semibold text-primary">{money(savings)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Availability</dt>
                <dd className="font-semibold text-foreground">
                  {product.stockQuantity > 0 ? "In stock" : "Out of stock"}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Member reviews</span>
              <h2 className="mt-4 text-2xl sm:text-3xl">What members say</h2>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-soft">
              <span className="text-3xl font-extrabold text-primary">
                {averageRating.toFixed(1)}
              </span>
              <div>
                <Stars value={Math.round(averageRating)} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {reviews.length} verified reviews
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.name}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <Stars value={review.rating} />
                <h3 className="mt-4 text-base">{review.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {review.name} • verified member
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={
            star <= value
              ? "size-4 fill-primary text-primary"
              : "size-4 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}
