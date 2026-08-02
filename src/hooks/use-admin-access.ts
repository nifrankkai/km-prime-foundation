import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getAdminAccess } from "@/lib/admin.functions";

export function useAdminAccess() {
  const fetchAccess = useServerFn(getAdminAccess);
  const query = useQuery({
    queryKey: ["admin-access"],
    queryFn: () => fetchAccess(),
    staleTime: 60_000,
  });

  const permissions = query.data?.permissions ?? [];
  const can = (key: string) => permissions.includes("*") || permissions.includes(key);

  return { ...query, access: query.data, can, isStaff: query.data?.isStaff ?? false };
}
