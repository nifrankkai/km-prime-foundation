import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useBranding } from "@/hooks/use-branding";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/branding")({
  head: () => ({
    meta: [
      { title: "Branding — KM Prime Admin" },
      { name: "description", content: "Update the KM Prime logo and favicon." },
    ],
  }),
  component: AdminBranding,
});

const MAX_BYTES = 300 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function AdminBranding() {
  const { access, isLoading } = useAdminAccess();
  const isSuperAdmin = access?.roles.includes("super_admin") ?? false;
  const { data: branding } = useBranding();
  const queryClient = useQueryClient();

  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);

  useEffect(() => {
    setLogo(branding?.logo_url ?? null);
    setFavicon(branding?.favicon_url ?? null);
  }, [branding?.logo_url, branding?.favicon_url]);

  const save = useMutation({
    mutationFn: async (payload: { logo_url: string | null; favicon_url: string | null }) => {
      const { error } = await supabase
        .from("site_branding")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Branding updated");
      void queryClient.invalidateQueries({ queryKey: ["site-branding"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <PanelCard title="Branding" description="Super Administrator access only.">
        <p className="text-sm text-muted-foreground">
          Only a Super Administrator can change the platform logo and favicon.
        </p>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6">
      <PanelCard
        title="Logo"
        description="Shown in the site header, footer and admin console. PNG or SVG, max 300 KB."
      >
        <AssetField
          value={logo}
          previewClass="h-12 w-auto max-w-[14rem] object-contain"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          onChange={setLogo}
        />
      </PanelCard>

      <PanelCard title="Favicon" description="Browser tab icon. Square PNG, SVG or ICO, max 300 KB.">
        <AssetField
          value={favicon}
          previewClass="h-10 w-10 object-contain"
          accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
          onChange={setFavicon}
        />
      </PanelCard>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="prime"
          disabled={save.isPending}
          onClick={() => save.mutate({ logo_url: logo, favicon_url: favicon })}
        >
          {save.isPending ? "Saving…" : "Save branding"}
        </Button>
        <Button
          variant="outline"
          disabled={save.isPending}
          onClick={() => {
            setLogo(branding?.logo_url ?? null);
            setFavicon(branding?.favicon_url ?? null);
          }}
        >
          Reset changes
        </Button>
      </div>
    </div>
  );
}

function AssetField({
  value,
  accept,
  previewClass,
  onChange,
}: {
  value: string | null;
  accept: string;
  previewClass: string;
  onChange: (next: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="grid min-h-16 min-w-16 place-items-center rounded-xl border border-border bg-secondary/40 p-3">
        {value ? (
          <img src={value} alt="Current asset" className={previewClass} />
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > MAX_BYTES) {
            toast.error("File is too large. Keep it under 300 KB.");
            return;
          }
          try {
            onChange(await readAsDataUrl(file));
          } catch (error) {
            toast.error((error as Error).message);
          }
        }}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Upload image
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
