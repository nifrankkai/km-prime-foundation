import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/legal-page";

const title = "Terms of Service — KM Prime";
const description =
  "The terms that govern KM Prime membership, business licences, orders and use of the platform.";

export const Route = createFileRoute("/terms")({
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
  component: () => <LegalPage contentKey="page_terms" fallbackTitle="Terms of Service" />,
});
