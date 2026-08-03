import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { InactivityGuard } from "@/components/auth/inactivity-guard";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <>
      <ImpersonationBanner />
      <Outlet />
      <InactivityGuard />
    </>
  );
}
