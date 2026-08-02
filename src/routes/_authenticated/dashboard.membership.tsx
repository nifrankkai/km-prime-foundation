import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { activateMembership, getLicensePayments, payLicense } from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/dashboard/membership")({
  component: MembershipPanel,
});

const membershipLabels: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
};

const licenseLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  grace_period: "Grace period",
};

const kindLabels: Record<string, string> = {
  membership_package: "Membership Package",
  license_activation: "Business Licence — activation",
  license_renewal: "Business Licence — monthly",
};

function MembershipPanel() {
  const queryClient = useQueryClient();
  const { data: overview, isLoading } = useMemberOverview();

  const fetchPayments = useServerFn(getLicensePayments);
  const { data: payments } = useQuery({
    queryKey: ["license-payments"],
    queryFn: () => fetchPayments(),
  });

  const activateFn = useServerFn(activateMembership);
  const payFn = useServerFn(payLicense);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["member-overview"] });
    queryClient.invalidateQueries({ queryKey: ["license-payments"] });
    queryClient.invalidateQueries({ queryKey: ["matrix-tree"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] });
  };

  const activate = useMutation({
    mutationFn: () => activateFn(),
    onSuccess: () => {
      toast.success("Activated — $65 package + $10 licence recorded. You have been placed in the matrix.");
      invalidate();
    },
    onError: () => toast.error("Activation could not be completed."),
  });

  const renew = useMutation({
    mutationFn: () => payFn(),
    onSuccess: () => {
      toast.success("Licence payment recorded — active for another 30 days.");
      invalidate();
    },
    onError: () => toast.error("Payment could not be recorded."),
  });

  const activated = overview?.membershipStatus === "active";

  return (
    <>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <PanelCard
          title="Membership & Licence"
          description="Your $65 Membership Package and $10/month Business Licence at a glance."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Membership"
              value={isLoading ? "…" : membershipLabels[overview?.membershipStatus ?? "pending"]}
            />
            <Stat
              label="Business Licence"
              value={isLoading ? "…" : licenseLabels[overview?.licenseStatus ?? "inactive"]}
              tone={overview?.licenseStatus === "grace_period" ? "warn" : undefined}
            />
            <Stat
              label="Licence expiry"
              value={
                overview?.licenseExpiryDate
                  ? new Date(overview.licenseExpiryDate).toLocaleDateString()
                  : "—"
              }
            />
            <Stat label="Rank" value={overview?.rank.name ?? "Member"} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!activated ? (
              <Button
                variant="prime"
                disabled={activate.isPending}
                onClick={() => activate.mutate()}
              >
                Activate for $75 ($65 + $10)
              </Button>
            ) : (
              <Button variant="prime" disabled={renew.isPending} onClick={() => renew.mutate()}>
                Pay $10 monthly licence
              </Button>
            )}
          </div>
        </PanelCard>

        <PanelCard
          title="What each tier unlocks"
          description="The Membership Package alone earns Direct Referral Bonus only."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TierCard
              title="Membership Package"
              price="$65"
              cadence="one-time"
              items={[
                "Account registration",
                "Product purchases at member pricing",
                "Sponsor new members",
                "Direct Referral Bonus eligibility",
              ]}
            />
            <TierCard
              title="Business License"
              price="$10"
              cadence="first payment, then $10/month"
              highlight
              items={[
                "2 × 15 matrix placement & spillover",
                "Matrix commission ($0.15 per active member)",
                "Product, matching & leadership bonuses",
                "Rank bonuses and weekly/monthly team commissions",
              ]}
            />
          </div>
        </PanelCard>

        <PanelCard title="Payment history" description="Your membership and licence charges.">
          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="p-4 font-semibold text-muted-foreground">Item</th>
                    <th className="p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="p-4 font-semibold text-muted-foreground">Period</th>
                    <th className="p-4 font-semibold text-muted-foreground">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="p-4 font-medium">{kindLabels[p.kind] ?? p.kind}</td>
                      <td className="p-4 font-bold text-primary">
                        ${(p.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {p.period_end ? new Date(p.period_end).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(p.paid_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          )}
        </PanelCard>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warn"
            ? "mt-2 text-lg font-extrabold text-destructive"
            : "mt-2 text-lg font-extrabold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function TierCard({
  title,
  price,
  cadence,
  items,
  highlight,
}: {
  title: string;
  price: string;
  cadence: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border border-primary/30 bg-primary-soft/40 p-6 shadow-soft"
          : "rounded-2xl border border-border bg-card p-6 shadow-soft"
      }
    >
      <h3 className="text-lg">{title}</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-primary">{price}</span>
        <span className="text-xs text-muted-foreground">{cadence}</span>
      </div>
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
