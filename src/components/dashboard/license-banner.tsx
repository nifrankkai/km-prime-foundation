import { AlertTriangle } from "lucide-react";

import type { MemberOverview } from "@/lib/membership.functions";

export function LicenseBanner({ overview }: { overview: MemberOverview | undefined }) {
  if (!overview) return null;
  if (overview.licenseStatus === "active") return null;

  const grace = overview.licenseStatus === "grace_period";

  return (
    <div
      role="alert"
      className={
        grace
          ? "mb-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5"
          : "mb-6 flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 p-5"
      }
    >
      <AlertTriangle
        className={grace ? "mt-0.5 size-5 text-destructive" : "mt-0.5 size-5 text-muted-foreground"}
      />
      <div className="text-sm">
        <p className={grace ? "font-bold text-destructive" : "font-bold text-foreground"}>
          {grace
            ? `Business Licence payment overdue — ${overview.graceDaysLeft ?? 0} day(s) left in your grace period`
            : "Business Licence inactive"}
        </p>
        <p className="mt-1 text-muted-foreground">
          {grace
            ? "Pay your $10 monthly licence to avoid losing your matrix position. Bonus calculations continue during the grace period only."
            : "Reactivate your $10/month licence to resume matrix, spillover and team commissions. You will be placed in the next open position under an active upline member."}
        </p>
      </div>
    </div>
  );
}
