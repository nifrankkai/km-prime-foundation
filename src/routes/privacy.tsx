import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/legal-page";

const title = "Privacy Policy — KM Prime";
const description =
  "How KM Prime collects, uses and protects member and customer information across the platform.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage contentKey="page_privacy" fallbackTitle="Privacy Policy" />,
});
