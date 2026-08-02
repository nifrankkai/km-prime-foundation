import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PanelCard } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemberOverview } from "@/hooks/use-member-overview";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardIndex,
});

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function DashboardIndex() {
  const { data: overview } = useMemberOverview();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, email")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile…</div>;
  }

  return (
    <>
      <LicenseBanner overview={overview} />

      <div className="space-y-6">
        <PanelCard title="My Profile" description="Your account details and compensation status.">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="grid size-20 place-items-center rounded-2xl bg-primary-soft text-primary-deep">
              <User className="size-10" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{profile?.full_name}</h2>
                <Badge
                  variant="outline"
                  className="rounded-lg border-primary-soft bg-primary-soft/50 text-[10px] font-bold uppercase tracking-wider text-primary-deep"
                >
                  {overview?.rank.name ?? "Member"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                @{profile?.username} • {profile?.email}
              </p>
            </div>
            <Button asChild variant="primeGhost">
              <Link to="/dashboard/membership">Manage licence</Link>
            </Button>
          </div>
        </PanelCard>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Membership"
            value={overview?.membershipStatus === "active" ? "Active" : "Pending"}
          />
          <Tile
            label="Business Licence"
            value={
              overview?.licenseStatus === "active"
                ? "Active"
                : overview?.licenseStatus === "grace_period"
                  ? "Grace period"
                  : "Inactive"
            }
            warn={overview?.licenseStatus !== "active"}
          />
          <Tile
            label="Licence expiry"
            value={
              overview?.licenseExpiryDate
                ? new Date(overview.licenseExpiryDate).toLocaleDateString()
                : "—"
            }
          />
          <Tile label="Wallet balance" value={money(overview?.wallet.paidCents ?? 0)} accent />
        </div>

        <PanelCard title="Compensation snapshot" description="Where you stand this month.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Active directs" value={`${overview?.activeDirects ?? 0} / 2`} />
            <Tile label="Matrix volume" value={`${overview?.matrixVolume ?? 0}`} />
            <Tile label="Unlocked levels" value={`${overview?.rank.unlockedLevels ?? 2} / 15`} />
          </div>
        </PanelCard>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean | undefined;
  warn?: boolean | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          accent
            ? "mt-2 text-xl font-extrabold text-primary"
            : warn
              ? "mt-2 text-xl font-extrabold text-destructive"
              : "mt-2 text-xl font-extrabold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
