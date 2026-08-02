import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PanelCard } from "@/components/dashboard/panel-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/membership")({
  component: MembershipPanel,
});

const labels: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
};

function MembershipPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["membership"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data: member, error } = await supabase
        .from("members")
        .select("status, created_at")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return member;
    },
  });

  const status = data?.status ?? "pending";

  return (
    <PanelCard
      title="Membership Status"
      description="Activation, tiers and benefits tracking come in the next phase."
    >
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-5">
        <span className="eyebrow">{isLoading ? "Loading…" : labels[status]}</span>
        <p className="text-sm text-muted-foreground">
          {status === "active"
            ? "Your membership is active — member pricing applies at checkout."
            : "Your account is awaiting activation. Member pricing unlocks once approved."}
        </p>
      </div>
    </PanelCard>
  );
}
