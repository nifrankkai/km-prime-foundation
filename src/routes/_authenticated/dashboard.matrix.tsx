import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Network } from "lucide-react";

import { PanelCard } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { MatrixTree } from "@/components/dashboard/matrix-tree";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { getMatrixTree } from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/dashboard/matrix")({
  component: MatrixPanel,
});

function MatrixPanel() {
  const { data: overview } = useMemberOverview();
  const fetchTree = useServerFn(getMatrixTree);
  const { data, isLoading } = useQuery({ queryKey: ["matrix-tree"], queryFn: () => fetchTree() });

  return (
    <>
      <LicenseBanner overview={overview} />
      <PanelCard
        title="Matrix Tree"
        description="Your 2 x 15 forced matrix. Filled positions include spillover placed by your upline."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Structure" value="2 wide × 15 deep" />
          <Stat label="Unlocked levels" value={`${overview?.rank.unlockedLevels ?? 2} of 15`} />
          <Stat label="Active matrix volume" value={`${overview?.matrixVolume ?? 0} members`} />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-secondary/30 p-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your matrix…</p>
          ) : data?.root ? (
            <MatrixTree root={data.root} levels={3} />
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Network className="size-5" />
              You have no matrix position yet. Activate your Business Licence to be placed.
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Showing the first 3 levels. New recruits are placed breadth-first from your position — left
          slot, then right, then deeper level by level.
        </p>
      </PanelCard>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-foreground">{value}</p>
    </div>
  );
}
