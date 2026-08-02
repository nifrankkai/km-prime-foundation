import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart } from "lucide-react";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/commerce.functions";
import { money } from "@/lib/format";

const title = "Shop Wellness Essentials — KM Prime";
const description =
  "Browse KM Prime supplements and home essentials with retail and member pricing side by side, plus the point value earned on every order.";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const fetchProducts = useServerFn(listProducts);
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="section-shell py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1 className="mt-5 text-4xl sm:text-5xl">Shop KM Prime</h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Every product carries a point value (PV) that counts toward your personal and group
              volume each cycle.
            </p>
          </div>
          <Button asChild variant="primeGhost">
            <Link to="/cart">
              <ShoppingCart /> View cart
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-12 text-sm text-muted-foreground">Loading the catalogue…</p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(products ?? []).map((product) => (
              <Link
                key={product.id}
                to="/shop/$slug"
                params={{ slug: product.slug }}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="grid place-items-center rounded-xl bg-secondary/60 p-4">
                  <img
                    src={product.images[0] ?? "/products/product-1.jpg"}
                    alt={product.name}
                    loading="lazy"
                    width={700}
                    height={700}
                    className="shadow-float h-40 w-auto object-contain"
                  />
                </div>
                <span className="eyebrow mt-5">{product.category}</span>
                <h2 className="mt-3 text-lg">{product.name}</h2>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-sm text-muted-foreground line-through">
                    {money(product.retailPriceCents)}
                  </span>
                  <span className="text-xl font-extrabold text-primary">
                    {money(product.priceCents)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Member price • {product.pv} PV
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
