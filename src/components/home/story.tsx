import { Check } from "lucide-react";

import storyImage from "@/assets/story.jpg";

const points = [
  "Sourced from audited manufacturing partners",
  "Every batch published with its own test report",
  "One honest price list — no hidden distributor tiers",
];

export function Story() {
  return (
    <section className="section-shell grid items-center gap-12 py-20 lg:grid-cols-2">
      <div className="overflow-hidden rounded-3xl border border-border shadow-lift">
        <img
          src={storyImage}
          alt="KM Prime quality control team inspecting products"
          loading="lazy"
          width={1200}
          height={900}
          className="h-full w-full object-cover"
        />
      </div>
      <div>
        <span className="eyebrow">Why KM Prime</span>
        <h2 className="mt-5 text-3xl sm:text-4xl">
          We started because good products were priced badly.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Too many premium wellness and home products pass through four or five hands before they
          reach a shelf, and every hand adds a margin. KM Prime keeps the chain short: we work
          directly with certified manufacturers, publish what we test, and pass the difference to
          the people who actually use and recommend the products.
        </p>
        <ul className="mt-7 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
              <span className="text-sm text-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
