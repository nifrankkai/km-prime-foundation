import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { LicenseBanner } from "@/components/dashboard/license-banner";
import { PanelCard } from "@/components/dashboard/panel-card";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { getPerformance, listCommissionRules, listRanks } from "@/lib/compensation.functions";

export const Route = createFileRoute("/_authenticated/dashboard/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  const { data: overview } = useMemberOverview();
  const fetchPerformance = useServerFn(getPerformance);
  const fetchRanks = useServerFn(listRanks);
  const fetchRules = useServerFn(listCommissionRules);

  const { data: performance } = useQuery({
    queryKey: ["performance"],
    queryFn: () => fetchPerformance(),
  });
  const { data: ranks } = useQuery({ queryKey: ["ranks"], queryFn: () => fetchRanks() });
  const { data: rules } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: () => fetchRules(),
  });

  const currentRank = overview?.rank.key ?? "member";
  const nextRank = (ranks ?? []).find(
    (rank) => rank.level > ((ranks ?? []).find((r) => r.key === currentRank)?.level ?? 0),
  );

  return (
    <div className="space-y-6">
      <LicenseBanner overview={overview} />

      <PanelCard
        title="PV & rank advancement"
        description="Your personal and group point value for the current cycle, and what the next rank requires."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Personal PV" value={`${performance?.personalPv ?? 0} PV`} />
          <Stat label="Group PV" value={`${performance?.groupPv ?? 0} PV`} />
          <Stat label="Active directs" value={String(overview?.activeDirects ?? 0)} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current rank
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {overview?.rank.name ?? "Member"}
          </p>
          {nextRank && (
            <p className="mt-3 text-sm text-muted-foreground">
              Next: <span className="font-bold text-foreground">{nextRank.name}</span> requires{" "}
              {nextRank.minPersonalPv} personal PV, {nextRank.minGroupPv} group PV and{" "}
              {nextRank.minActiveDirects} active directs.
            </p>
          )}
        </div>
      </PanelCard>

      <PanelCard title="Rank ladder" description="Thresholds evaluated automatically in the monthly cycle.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-3">Rank</th>
                <th className="py-3">Personal PV</th>
                <th className="py-3">Group PV</th>
                <th className="py-3">Directs</th>
                <th className="py-3">Levels</th>
              </tr>
            </thead>
            <tbody>
              {(ranks ?? []).map((rank) => (
                <tr
                  key={rank.key}
                  className={
                    rank.key === currentRank
                      ? "border-b border-border bg-primary-soft/40 font-bold text-primary-deep"
                      : "border-b border-border text-muted-foreground"
                  }
                >
                  <td className="py-3">{rank.name}</td>
                  <td className="py-3">{rank.minPersonalPv}</td>
                  <td className="py-3">{rank.minGroupPv}</td>
                  <td className="py-3">{rank.minActiveDirects}</td>
                  <td className="py-3">{rank.unlockedLevels}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard
        title="Commission rules"
        description="Configurable payout rules applied by the weekly and monthly payout jobs."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(rules ?? []).map((rule) => (
            <div key={rule.key} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">{rule.name}</p>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">
                  {rule.payoutFrequency}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{rule.payoutFormula}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Rank history" description="Every promotion logged by the monthly evaluation job.">
        {(performance?.rankHistory ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No rank changes recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(performance?.rankHistory ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-background p-4"
              >
                <span className="font-semibold text-foreground">
                  {entry.from_rank} → {entry.to_rank}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString()} • {entry.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
