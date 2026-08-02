import { FlaskConical, ReceiptText, ScanEye } from "lucide-react";

const features = [
  {
    icon: FlaskConical,
    title: "Quality",
    body: "Formulated with certified partners and released only after third-party batch testing. If a batch fails, it never ships.",
  },
  {
    icon: ReceiptText,
    title: "Fair Pricing",
    body: "One published price list for everyone, with a clear member rate. No inflated retail number invented to make a discount look big.",
  },
  {
    icon: ScanEye,
    title: "Transparency",
    body: "Ingredient origin, test reports, and membership terms are documented and readable before you spend a cent.",
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-secondary/40 py-20">
      <div className="section-shell">
        <div className="max-w-2xl">
          <span className="eyebrow">What we stand on</span>
          <h2 className="mt-5 text-3xl sm:text-4xl">Three commitments, kept in writing.</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-7 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-deep">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-xl">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
