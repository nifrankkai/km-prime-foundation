import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/legal-page";

const title = "Refund Policy — KM Prime";
const description =
  "How returns, cancellations and refunds work for KM Prime product orders and membership payments.";

export const Route = createFileRoute("/refund")({
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
  component: () => <LegalPage contentKey="page_refund" fallbackTitle="Refund Policy" />,
});
