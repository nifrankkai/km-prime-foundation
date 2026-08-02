import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { adminUpdateRank } from "@/lib/admin.functions";
import { listRanks } from "@/lib/compensation.functions";

export const Route = createFileRoute("/_authenticated/admin/ranks")({
  component: AdminRanks,
});

function AdminRanks() {
  const queryClient = useQueryClient();
  const fetchRanks = useServerFn(listRanks);
  const update = useServerFn(adminUpdateRank);

  const { data: ranks, isLoading } = useQuery({ queryKey: ["ranks"], queryFn: () => fetchRanks() });

  const mutation = useMutation({
    mutationFn: (vars: {
      key: string;
      minPersonalPv: number;
      minGroupPv: number;
      minActiveDirects: number;
      unlockedLevels: number;
      leadershipShare: number;
    }) => update({ data: vars }),
    onSuccess: () => {
      toast.success("Rank thresholds updated");
      void queryClient.invalidateQueries({ queryKey: ["ranks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard
      title="Rank management"
      description="Adjust PV thresholds, active-direct requirements and unlocked matrix levels."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading ranks…</p>}
      <div className="space-y-3">
        {ranks?.map((rank) => (
          <div
            key={rank.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-semibold">{rank.name}</p>
              <p className="text-xs text-muted-foreground">
                {rank.minPersonalPv} personal PV · {rank.minGroupPv} group PV ·{" "}
                {rank.minActiveDirects} active directs · {rank.unlockedLevels} levels ·{" "}
                {rank.leadershipShare}% leadership
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const ask = (label: string, current: number) => {
                  const raw = window.prompt(label, String(current));
                  return raw === null ? null : Number(raw);
                };
                const minPersonalPv = ask("Minimum personal PV", rank.minPersonalPv);
                if (minPersonalPv === null) return;
                const minGroupPv = ask("Minimum group PV", rank.minGroupPv);
                if (minGroupPv === null) return;
                const minActiveDirects = ask("Minimum active directs", rank.minActiveDirects);
                if (minActiveDirects === null) return;
                const unlockedLevels = ask("Unlocked matrix levels (1-15)", rank.unlockedLevels);
                if (unlockedLevels === null) return;
                const leadershipShare = ask("Leadership share (%)", rank.leadershipShare);
                if (leadershipShare === null) return;

                const values = [minPersonalPv, minGroupPv, minActiveDirects, unlockedLevels, leadershipShare];
                if (values.some((value) => !Number.isFinite(value) || value < 0)) {
                  toast.error("All values must be positive numbers");
                  return;
                }

                mutation.mutate({
                  key: rank.key,
                  minPersonalPv,
                  minGroupPv,
                  minActiveDirects,
                  unlockedLevels,
                  leadershipShare,
                });
              }}
            >
              Edit thresholds
            </Button>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
