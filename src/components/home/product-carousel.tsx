import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { products } from "@/data/products";

export function ProductCarousel() {
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
            {products.map((product) => (
              <CarouselItem key={product.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                <article className="h-full rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-lift">
                  <div className="grid place-items-center rounded-xl bg-secondary/60 p-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      width={700}
                      height={700}
                      className="shadow-float h-44 w-auto object-contain"
                    />
                  </div>
                  <span className="eyebrow mt-5">{product.tag}</span>
                  <h3 className="mt-3 text-lg">{product.name}</h3>
                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="text-sm text-muted-foreground line-through">
                      {product.retail}
                    </span>
                    <span className="text-xl font-extrabold text-primary">{product.member}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Member price</p>
                </article>
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
