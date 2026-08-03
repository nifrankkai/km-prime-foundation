import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useSiteContent } from "@/hooks/use-site-content";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/legal")({
  head: () => ({
    meta: [
      { title: "Legal & footer content — KM Prime Admin" },
      { name: "description", content: "Edit the KM Prime footer details and legal pages." },
    ],
  }),
  component: AdminLegal,
});

const sections = [
  {
    key: "footer_disclaimer",
    label: "Footer compliance disclaimer",
    hint: "Plain text shown in the footer disclaimer block.",
    rows: 6,
    showTitle: true,
  },
  {
    key: "footer_address",
    label: "Footer company address",
    hint: "HTML allowed — use <br /> for line breaks.",
    rows: 6,
    showTitle: true,
  },
  { key: "page_privacy", label: "Privacy Policy page", hint: "Paste HTML5 — rendered as-is at /privacy.", rows: 16, showTitle: true },
  { key: "page_terms", label: "Terms of Service page", hint: "Paste HTML5 — rendered as-is at /terms.", rows: 16, showTitle: true },
  { key: "page_refund", label: "Refund Policy page", hint: "Paste HTML5 — rendered as-is at /refund.", rows: 16, showTitle: true },
] as const;

function AdminLegal() {
  const { access, isLoading } = useAdminAccess();
  const isSuperAdmin = access?.roles.includes("super_admin") ?? false;
  const { data } = useSiteContent();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Record<string, { title: string; content: string }>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, { title: string; content: string }> = {};
    for (const section of sections) {
      const row = data[section.key];
      next[section.key] = { title: row?.title ?? section.label, content: row?.content ?? "" };
    }
    setDraft(next);
  }, [data]);

  const save = useMutation({
    mutationFn: async (key: string) => {
      const value = draft[key];
      if (!value) throw new Error("Nothing to save yet.");
      const { error } = await supabase
        .from("site_content")
        .upsert({ key, title: value.title, content: value.content }, { onConflict: "key" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Content saved");
      void queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!isSuperAdmin) {
    return (
      <PanelCard title="Legal & footer content" description="Super Administrator access only.">
        <p className="text-sm text-muted-foreground">
          Only a Super Administrator can edit the footer details and legal pages.
        </p>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <PanelCard key={section.key} title={section.label} description={section.hint}>
          <div className="grid gap-3">
            {section.showTitle && (
              <Input
                value={draft[section.key]?.title ?? ""}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [section.key]: {
                      title: event.target.value,
                      content: prev[section.key]?.content ?? "",
                    },
                  }))
                }
                placeholder="Heading"
              />
            )}
            <Textarea
              className="font-mono text-xs"
              rows={section.rows}
              value={draft[section.key]?.content ?? ""}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  [section.key]: {
                    title: prev[section.key]?.title ?? section.label,
                    content: event.target.value,
                  },
                }))
              }
              placeholder="<h2>Section</h2><p>Your text…</p>"
            />
            <div>
              <Button
                variant="prime"
                disabled={save.isPending}
                onClick={() => save.mutate(section.key)}
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </PanelCard>
      ))}
    </div>
  );
}
