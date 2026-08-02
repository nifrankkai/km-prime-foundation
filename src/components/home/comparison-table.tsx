import { Check, Minus, X } from "lucide-react";

type Cell = true | false | string;

const rows: { label: string; prime: Cell; a: Cell; b: Cell }[] = [
  { label: "Published third-party batch reports", prime: true, a: false, b: false },
  { label: "Single transparent price list", prime: true, a: false, b: true },
  { label: "Member pricing without hidden tiers", prime: true, a: true, b: false },
  { label: "Full ingredient origin disclosure", prime: true, a: false, b: "Partial" },
  { label: "30-day money-back guarantee", prime: true, a: true, b: false },
  { label: "Referral earnings paid on real orders", prime: true, a: false, b: false },
];

function CellView({ value, highlight = false }: { value: Cell; highlight?: boolean }) {
  if (typeof value === "string") {
    return <span className="text-xs font-semibold text-muted-foreground">{value}</span>;
  }
  if (value) {
    return (
      <span
        className={
          highlight
            ? "grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"
            : "grid size-6 place-items-center rounded-full bg-primary-soft text-primary-deep"
        }
      >
        <Check className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
      <X className="size-3.5" />
    </span>
  );
}

export function ComparisonTable() {
  return (
    <section className="section-shell py-20">
      <div className="max-w-2xl">
        <span className="eyebrow">Side by side</span>
        <h2 className="mt-5 text-3xl sm:text-4xl">How KM Prime compares.</h2>
        <p className="mt-4 text-muted-foreground">
          Measured against the two most common models we see in the market.
        </p>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="p-5 text-sm font-semibold text-muted-foreground">Feature</th>
              <th className="border-x border-border bg-primary-soft/70 p-5 text-sm font-extrabold text-primary-deep">
                KM Prime
              </th>
              <th className="p-5 text-sm font-semibold text-muted-foreground">
                Typical retail brand
              </th>
              <th className="p-5 text-sm font-semibold text-muted-foreground">
                Typical online reseller
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <td className="p-5 text-sm font-medium text-foreground">{row.label}</td>
                <td className="border-x border-border bg-primary-soft/40 p-5">
                  <CellView value={row.prime} highlight />
                </td>
                <td className="p-5">
                  <CellView value={row.a} />
                </td>
                <td className="p-5">
                  <CellView value={row.b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Minus className="size-3" /> Comparison reflects publicly available terms at time of
        writing.
      </p>
    </section>
  );
}
