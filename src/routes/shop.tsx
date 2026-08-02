import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { products } from "@/data/products";

const title = "Shop — KM Prime";
const description =
  "Browse KM Prime wellness and home essentials with retail and member pricing shown side by side.";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="section-shell py-16">
        <span className="eyebrow">Catalogue</span>
        <h1 className="mt-5 text-4xl sm:text-5xl">Shop KM Prime</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Sample catalogue for this phase. Checkout and live inventory arrive with the store build.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="grid place-items-center rounded-xl bg-secondary/60 p-4">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  width={700}
                  height={700}
                  className="shadow-float h-40 w-auto object-contain"
                />
              </div>
              <span className="eyebrow mt-5">{product.tag}</span>
              <h2 className="mt-3 text-lg">{product.name}</h2>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-sm text-muted-foreground line-through">{product.retail}</span>
                <span className="text-xl font-extrabold text-primary">{product.member}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Member price</p>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
