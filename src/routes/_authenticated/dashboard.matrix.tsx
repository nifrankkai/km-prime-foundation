import { createFileRoute } from "@tanstack/react-router";

import { PanelCard, PlaceholderGrid } from "@/components/dashboard/panel-card";

export const Route = createFileRoute("/_authenticated/dashboard/matrix")({
  component: MatrixPanel,
});

function MatrixPanel() {
  return (
    <PanelCard
      title="Matrix Tree"
      description="Placement, downline visualisation and referral depth arrive in Phase 2."
    >
      <PlaceholderGrid
        rows={["Direct referrals", "Placement position", "Downline depth", "Team volume"]}
      />
    </PanelCard>
  );
}
