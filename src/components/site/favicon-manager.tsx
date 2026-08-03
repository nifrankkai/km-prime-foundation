import { useEffect } from "react";

import { useBranding } from "@/hooks/use-branding";

/** Applies the admin-configured favicon to the document head. */
export function FaviconManager() {
  const { data } = useBranding();
  const favicon = data?.favicon_url ?? null;

  useEffect(() => {
    if (!favicon) return;
    const links = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']");
    links.forEach((l) => l.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    document.head.appendChild(link);
  }, [favicon]);

  return null;
}
