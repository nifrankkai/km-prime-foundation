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
  const ladder = ranks ?? [];
  const currentLevel = ladder.find((r) => r.key === currentRank)?.level ?? 0;
  const nextRank = ladder.find((rank) => rank.level > currentLevel);

  const personalPv = performance?.personalPv ?? 0;
  const groupPv = performance?.groupPv ?? 0;
  const directs = overview?.activeDirects ?? 0;
  const pct = (value: number, target: number) =>
    target <= 0 ? 100 : Math.min(100, Math.round((value / target) * 100));

  return (
    <div className="space-y-6">
      <LicenseBanner overview={overview} />

      <PanelCard
        title="PV & rank advancement"
        description="Your personal and group point value for the current cycle, and what the next rank requires."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Personal PV" value={`${personalPv} PV`} />
          <Stat label="Group PV" value={`${groupPv} PV`} />
          <Stat label="Active directs" value={String(directs)} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current rank
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {overview?.rank.name ?? "Member"}
          </p>
          {nextRank ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Progress to <span className="font-bold text-foreground">{nextRank.name}</span>
              </p>
              <Progress
                label="Personal PV"
                value={personalPv}
                target={nextRank.minPersonalPv}
                pct={pct(personalPv, nextRank.minPersonalPv)}
              />
              <Progress
                label="Group PV"
                value={groupPv}
                target={nextRank.minGroupPv}
                pct={pct(groupPv, nextRank.minGroupPv)}
              />
              <Progress
                label="Active directs"
                value={directs}
                target={nextRank.minActiveDirects}
                pct={pct(directs, nextRank.minActiveDirects)}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              You are at the highest rank. Maintain your PV each period to keep it.
            </p>
          )}
          <p className="mt-5 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            Ranks are re-evaluated every month. If your period figures fall below your current rank
            thresholds, your rank is adjusted down and you will be notified.
          </p>
        </div>
      </PanelCard>

      <PanelCard
        title="Recent PV activity"
        description="Every point-value credit posted to your account this period."
      >
        {(performance?.recentPv ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No PV recorded this period yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(performance?.recentPv ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-4"
              >
                <span className="font-semibold text-foreground">
                  {entry.type === "personal" ? "Personal PV" : `Group PV — level ${entry.level}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  +{entry.pv_amount} PV • {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title="PV history" description="Closing totals archived at the end of each period.">
        {(performance?.pvHistory ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No closed periods yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-3">Period</th>
                  <th className="py-3">Personal PV</th>
                  <th className="py-3">Group PV</th>
                  <th className="py-3">Rank</th>
                </tr>
              </thead>
              <tbody>
                {(performance?.pvHistory ?? []).map((row) => (
                  <tr key={row.period_month} className="border-b border-border text-muted-foreground">
                    <td className="py-3 font-semibold text-foreground">
                      {new Date(row.period_month).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3">{row.personal_pv}</td>
                    <td className="py-3">{row.group_pv}</td>
                    <td className="py-3">{row.rank_key ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      <PanelCard
        title="Rank history"
        description="Every promotion and demotion logged by the monthly evaluation job."
      >
        {(performance?.rankHistory ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No rank changes recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(performance?.rankHistory ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-background p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <span
                    className={
                      entry.direction === "demotion"
                        ? "rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-destructive"
                        : "rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold uppercase text-primary-deep"
                    }
                  >
                    {entry.direction === "demotion" ? "Demotion" : "Promotion"}
                  </span>
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

function Progress({
  label,
  value,
  target,
  pct,
}: {
  label: string;
  value: number;
  target: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        <span>
          {value} / {target}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

