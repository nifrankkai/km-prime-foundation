import { createFileRoute } from "@tanstack/react-router";

import { PanelCard, PlaceholderGrid } from "@/components/dashboard/panel-card";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPanel,
});

function OrdersPanel() {
  return (
    <PanelCard
      title="Orders"
      description="Order history and shipment tracking arrive with the store build."
    >
      <PlaceholderGrid
        rows={["Recent orders", "Shipment tracking", "Invoices", "Returns and refunds"]}
      />
    </PanelCard>
  );
}
