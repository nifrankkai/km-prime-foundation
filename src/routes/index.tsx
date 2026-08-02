import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Hero } from "@/components/home/hero";
import { TrustBadges } from "@/components/home/trust-badges";
import { Story } from "@/components/home/story";
import { FeatureGrid } from "@/components/home/feature-grid";
import { ComparisonTable } from "@/components/home/comparison-table";
import { ProductCarousel } from "@/components/home/product-carousel";
import { Testimonials } from "@/components/home/testimonials";
import { CtaBand } from "@/components/home/cta-band";

const title = "KM Prime — Premium Products at a Fair Member Price";
const description =
  "KM Prime sells lab-verified wellness and home essentials at transparent prices, with member pricing and referral rewards.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <TrustBadges />
        <Story />
        <FeatureGrid />
        <ComparisonTable />
        <ProductCarousel />
        <Testimonials />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
