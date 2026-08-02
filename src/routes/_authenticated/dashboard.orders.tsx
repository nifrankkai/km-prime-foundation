import { createFileRoute } from "@tanstack/react-router";

import { PanelCard, PlaceholderGrid } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { useMemberOverview } from "@/hooks/use-member-overview";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPanel,
});

function OrdersPanel() {
  const { data: overview } = useMemberOverview();

  return (
    <>
      <LicenseBanner overview={overview} />
      <PanelCard
        title="Orders"
        description="Order history and shipment tracking arrive with the store build."
      >
        <PlaceholderGrid
          rows={["Recent orders", "Shipment tracking", "Invoices", "Returns and refunds"]}
        />
      </PanelCard>
    </>
  );
}
