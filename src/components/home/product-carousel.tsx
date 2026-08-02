import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { listProducts } from "@/lib/commerce.functions";
import { money } from "@/lib/format";

export function ProductCarousel() {
  const fetchProducts = useServerFn(listProducts);
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });

  return (
    <section className="bg-secondary/40 py-20">
      <div className="section-shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="eyebrow">Best sellers</span>
            <h2 className="mt-5 text-3xl sm:text-4xl">Loved by members, priced for members.</h2>
          </div>
          <Button asChild variant="primeGhost">
            <Link to="/shop">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>

        <Carousel opts={{ align: "start" }} className="mt-10">
          <CarouselContent className="-ml-4">
            {(products ?? []).map((product) => (
              <CarouselItem key={product.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                <Link
                  to="/shop/$slug"
                  params={{ slug: product.slug }}
                  className="block h-full rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="grid place-items-center rounded-xl bg-secondary/60 p-4">
                    <img
                      src={product.images[0] ?? "/products/product-1.jpg"}
                      alt={product.name}
                      loading="lazy"
                      width={700}
                      height={700}
                      className="shadow-float h-44 w-auto object-contain"
                    />
                  </div>
                  <span className="eyebrow mt-5">{product.category}</span>
                  <h3 className="mt-3 text-lg">{product.name}</h3>
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
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div>
    </section>
  );
}
