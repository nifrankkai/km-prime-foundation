import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PanelCard } from "@/components/dashboard/panel-card";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { listPublishedAnnouncements } from "@/lib/wallet.functions";

export const Route = createFileRoute("/_authenticated/dashboard/news")({
  component: NewsPanel,
});

function NewsPanel() {
  const { data: overview } = useMemberOverview();
  const fetchNews = useServerFn(listPublishedAnnouncements);
  const { data: news, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchNews(),
  });

  return (
    <>
      <LicenseBanner overview={overview} />
      <PanelCard title="Company news" description="Announcements published by the KM Prime team.">
        {isLoading && <p className="text-sm text-muted-foreground">Loading announcements…</p>}
        {news?.length === 0 && (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
        <div className="space-y-3">
          {news?.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {new Date(item.published_at ?? item.created_at).toLocaleDateString()}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </PanelCard>
    </>
  );
}
