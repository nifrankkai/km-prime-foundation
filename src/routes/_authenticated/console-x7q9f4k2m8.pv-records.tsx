import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Search } from "lucide-react";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPvDetail, listPvRecords } from "@/lib/pv-admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/pv-records")({
  head: () => ({
    meta: [
      { title: "PV Records — KM Prime Console" },
      { name: "description", content: "Point value tracking per member across periods." },
    ],
  }),
  component: PvRecordsPage,
});

function PvRecordsPage() {
  const fetchRecords = useServerFn(listPvRecords);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pv-records"],
    queryFn: () => fetchRecords(),
  });

  if (selected) return <PvDetailView userId={selected} onBack={() => setSelected(null)} />;

  const term = query.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (row) =>
      !term ||
      row.fullName.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      (row.username ?? "").toLowerCase().includes(term),
  );

  return (
    <div className="space-y-6">
      <PanelCard
        title="PV records"
        description="Live personal and group point value for the current period, with the previous closed period for comparison."
      >
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            className="pl-9"
          />
        </div>

        {error ? (
          <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading PV records…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No members match that search.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-3">Member</th>
                  <th className="py-3">Rank</th>
                  <th className="py-3">Personal PV</th>
                  <th className="py-3">Group PV</th>
                  <th className="py-3">Last period</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-border">
                    <td className="py-3">
                      <p className="font-bold text-foreground">{row.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.username ? `@${row.username}` : row.email}
                      </p>
                    </td>
                    <td className="py-3 text-muted-foreground">{row.rankKey}</td>
                    <td className="py-3 font-semibold text-foreground">{row.currentPersonalPv}</td>
                    <td className="py-3 font-semibold text-foreground">{row.currentGroupPv}</td>
                    <td className="py-3 text-muted-foreground">
                      {row.lastPersonalPv} / {row.lastGroupPv}
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="primeGhost" size="sm" onClick={() => setSelected(row.userId)}>
                        History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function PvDetailView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const fetchDetail = useServerFn(getPvDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["pv-detail", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
  });

  return (
    <div className="space-y-6">
      <Button variant="primeGhost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 size-4" /> Back to PV records
      </Button>

      <PanelCard
        title={`PV history — ${data?.fullName ?? "Member"}`}
        description="Archived closing totals for each completed period."
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.history ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No archived periods yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-3">Period</th>
                  <th className="py-3">Personal PV</th>
                  <th className="py-3">Group PV</th>
                  <th className="py-3">Rank</th>
                </tr>
              </thead>
              <tbody>
                {(data?.history ?? []).map((row) => (
                  <tr key={row.periodMonth} className="border-b border-border text-muted-foreground">
                    <td className="py-3 font-semibold text-foreground">
                      {new Date(row.periodMonth).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3">{row.personalPv}</td>
                    <td className="py-3">{row.groupPv}</td>
                    <td className="py-3">{row.rankKey ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      <PanelCard title="PV ledger" description="The last 100 point-value credits posted to this member.">
        {(data?.transactions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No PV entries recorded.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(data?.transactions ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-4"
              >
                <span className="font-semibold text-foreground">
                  {entry.type === "personal"
                    ? "Personal PV"
                    : `Group PV — level ${entry.level}${entry.sourceName ? ` from ${entry.sourceName}` : ""}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  +{entry.pvAmount} PV • {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
