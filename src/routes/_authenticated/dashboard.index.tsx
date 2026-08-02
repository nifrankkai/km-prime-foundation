import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PanelCard } from "@/components/dashboard/panel-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: ProfilePanel,
});

function ProfilePanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, username, referrer_id")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return profile;
    },
  });

  const fields = [
    { label: "Full name", value: data?.full_name },
    { label: "Email", value: data?.email },
    { label: "Phone", value: data?.phone },
    { label: "Username", value: data?.username },
    { label: "Referred by", value: data?.referrer_id ? "Linked member" : "No referrer" },
  ];

  return (
    <PanelCard
      title="Profile"
      description="Your account details. Editing arrives with the next phase."
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-xl border border-border p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {field.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {isLoading ? "Loading…" : field.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </PanelCard>
  );
}
