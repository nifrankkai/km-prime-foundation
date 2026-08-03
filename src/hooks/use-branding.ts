import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Branding = {
  logo_url: string | null;
  favicon_url: string | null;
};

export function useBranding() {
  return useQuery<Branding>({
    queryKey: ["site-branding"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_branding")
        .select("logo_url, favicon_url")
        .maybeSingle();
      if (error) throw error;
      return { logo_url: data?.logo_url ?? null, favicon_url: data?.favicon_url ?? null };
    },
  });
}
