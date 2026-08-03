import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type SiteContentRow = {
  key: string;
  title: string;
  content: string;
};

export function useSiteContent() {
  return useQuery({
    queryKey: ["site-content"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("key, title, content");
      if (error) throw new Error(error.message);
      const map: Record<string, SiteContentRow> = {};
      for (const row of data ?? []) map[row.key] = row as SiteContentRow;
      return map;
    },
  });
}

export function useSiteContentEntry(key: string) {
  const query = useSiteContent();
  return { ...query, entry: query.data?.[key] ?? null };
}
