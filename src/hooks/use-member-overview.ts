import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMemberOverview } from "@/lib/membership.functions";

export function useMemberOverview() {
  const fetchOverview = useServerFn(getMemberOverview);
  return useQuery({
    queryKey: ["member-overview"],
    queryFn: () => fetchOverview(),
  });
}
