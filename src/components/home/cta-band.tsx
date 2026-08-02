import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="section-shell pb-20">
      <div className="rounded-3xl bg-primary px-8 py-14 text-center shadow-lift sm:px-14">
        <h2 className="mx-auto max-w-2xl text-3xl text-primary-foreground sm:text-4xl">
          Join KM Prime and pay the member price on your first order.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-primary-foreground/80">
          Free to register. Your account starts as Pending and is reviewed before activation.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="xl" variant="primeGhost">
            <Link to="/register">
              Become a Member <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-deep hover:text-primary-foreground"
          >
            <Link to="/shop">Browse products</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
