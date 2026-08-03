import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { useSiteContentEntry } from "@/hooks/use-site-content";

export function LegalPage({ contentKey, fallbackTitle }: { contentKey: string; fallbackTitle: string }) {
  const { entry, isLoading } = useSiteContentEntry(contentKey);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="section-shell py-16">
          <span className="eyebrow">Legal</span>
          <h1 className="mt-5 text-4xl sm:text-5xl">{entry?.title || fallbackTitle}</h1>
          <div className="mt-10 max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div
                className="prose-legal space-y-4 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: entry?.content ?? "" }}
              />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
