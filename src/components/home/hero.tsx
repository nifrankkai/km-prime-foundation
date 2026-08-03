import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import heroProducts from "@/assets/hero-products.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[28rem] bg-primary-soft/60 blur-3xl" />
      <div className="section-shell relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="eyebrow">
            <Sparkles className="size-3.5" /> Members save up to 30%
          </span>
          <h1 className="mt-6 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Premium products.
            <br />
            Priced the way
            <br />
            they should be.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            KM Prime cuts out the markup layers so you get lab-verified quality at a fair price —
            and members earn back on every product they share.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="prime" size="xl">
              <Link to="/shop">
                Shop Products <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="primeGhost" size="xl">
              <Link to="/membership">Become a Member</Link>
            </Button>
          </div>
          <div className="mt-8 flex items-baseline gap-4 text-sm">
            <span className="text-muted-foreground line-through">Typical retail $249</span>
            <span className="rounded-full bg-primary-soft px-3 py-1 font-bold text-primary-deep">
              Member price $174
            </span>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroProducts}
            alt="KM Prime premium product range"
            width={1408}
            height={1104}
            className="w-full mix-blend-multiply"
          />
        </div>
      </div>
    </section>
  );
}
