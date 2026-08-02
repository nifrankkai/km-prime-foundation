import { createFileRoute } from "@tanstack/react-router";

import { PanelCard, PlaceholderGrid } from "@/components/dashboard/panel-card";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  component: WalletPanel,
});

function WalletPanel() {
  return (
    <PanelCard
      title="Wallet"
      description="Balances, commission payouts and withdrawals arrive in Phase 2."
    >
      <PlaceholderGrid
        rows={["Available balance", "Pending earnings", "Payout history", "Withdrawal requests"]}
      />
    </PanelCard>
  );
}
