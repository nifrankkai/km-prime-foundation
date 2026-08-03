import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/mail")({
  head: () => ({
    meta: [
      { title: "Mail settings — KM Prime Admin" },
      {
        name: "description",
        content: "Configure SMTP delivery and edit the KM Prime email templates.",
      },
    ],
  }),
  component: AdminMail,
});

type MailSettings = {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  action_emails_enabled: boolean;
  notification_emails_enabled: boolean;
};

type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  enabled: boolean;
  sort_order: number;
};

const EMPTY: MailSettings = {
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_encryption: "tls",
  from_name: "KM Prime",
  from_email: "",
  reply_to: "",
  action_emails_enabled: false,
  notification_emails_enabled: true,
};

function AdminMail() {
  const { access, isLoading } = useAdminAccess();
  const isSuperAdmin = access?.roles.includes("super_admin") ?? false;
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["mail-settings"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_settings")
        .select(
          "smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption, from_name, from_email, reply_to, action_emails_enabled, notification_emails_enabled",
        )
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? EMPTY) as MailSettings;
    },
  });

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, key, name, category, subject, body, enabled, sort_order")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as EmailTemplate[];
    },
  });

  const [form, setForm] = useState<MailSettings>(EMPTY);
  useEffect(() => {
    if (settingsQuery.data) setForm({ ...settingsQuery.data, reply_to: settingsQuery.data.reply_to ?? "" });
  }, [settingsQuery.data]);

  const saveSettings = useMutation({
    mutationFn: async (payload: MailSettings) => {
      const { error } = await supabase
        .from("email_settings")
        .update({ ...payload, reply_to: payload.reply_to?.trim() || null })
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Mail settings saved");
      void queryClient.invalidateQueries({ queryKey: ["mail-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveTemplate = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: template.subject,
          body: template.body,
          enabled: template.enabled,
        })
        .eq("id", template.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Template saved");
      void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!isSuperAdmin) {
    return (
      <PanelCard title="Mail settings" description="Super Administrator access only.">
        <p className="text-sm text-muted-foreground">
          Only a Super Administrator can configure email delivery and templates.
        </p>
      </PanelCard>
    );
  }

  const templates = templatesQuery.data ?? [];
  const actionTemplates = templates.filter((t) => t.category === "action");
  const notificationTemplates = templates.filter((t) => t.category !== "action");

  const update = <K extends keyof MailSettings>(key: K, value: MailSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <PanelCard
        title="SMTP delivery"
        description="Outbound mail server used for all KM Prime emails. Email verification at sign-up is currently switched off."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMTP host">
            <Input
              value={form.smtp_host}
              placeholder="smtp.yourprovider.com"
              onChange={(e) => update("smtp_host", e.target.value)}
            />
          </Field>
          <Field label="Port">
            <Input
              type="number"
              value={form.smtp_port}
              onChange={(e) => update("smtp_port", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Username">
            <Input
              value={form.smtp_username}
              onChange={(e) => update("smtp_username", e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={form.smtp_password}
              onChange={(e) => update("smtp_password", e.target.value)}
            />
          </Field>
          <Field label="Encryption">
            <Select
              value={form.smtp_encryption}
              onValueChange={(value) => update("smtp_encryption", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">STARTTLS</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="From name">
            <Input value={form.from_name} onChange={(e) => update("from_name", e.target.value)} />
          </Field>
          <Field label="From email">
            <Input
              value={form.from_email}
              placeholder="no-reply@kmprime.com"
              onChange={(e) => update("from_email", e.target.value)}
            />
          </Field>
          <Field label="Reply-to (optional)">
            <Input
              value={form.reply_to ?? ""}
              onChange={(e) => update("reply_to", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 space-y-3">
          <ToggleRow
            title="Action emails"
            description="Sign-up confirmation, password reset, magic link and email change."
            checked={form.action_emails_enabled}
            onChange={(v) => update("action_emails_enabled", v)}
          />
          <ToggleRow
            title="Notification emails"
            description="Withdrawals, deposits, orders, KYC, commissions and rank updates."
            checked={form.notification_emails_enabled}
            onChange={(v) => update("notification_emails_enabled", v)}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="prime"
            disabled={saveSettings.isPending}
            onClick={() => saveSettings.mutate(form)}
          >
            {saveSettings.isPending ? "Saving…" : "Save mail settings"}
          </Button>
          <Button
            variant="outline"
            disabled={saveSettings.isPending}
            onClick={() =>
              setForm(
                settingsQuery.data
                  ? { ...settingsQuery.data, reply_to: settingsQuery.data.reply_to ?? "" }
                  : EMPTY,
              )
            }
          >
            Reset changes
          </Button>
        </div>
      </PanelCard>

      <PanelCard
        title="Action email templates"
        description="Authentication emails. Placeholders: {{full_name}}, {{action_url}}."
      >
        <TemplateList
          templates={actionTemplates}
          loading={templatesQuery.isLoading}
          onSave={(t) => saveTemplate.mutate(t)}
          saving={saveTemplate.isPending}
        />
      </PanelCard>

      <PanelCard
        title="Notification email templates"
        description="Transactional updates. Placeholders vary: {{full_name}}, {{amount}}, {{reason}}, {{order_reference}}, {{balance}}, {{dashboard_url}}."
      >
        <TemplateList
          templates={notificationTemplates}
          loading={templatesQuery.isLoading}
          onSave={(t) => saveTemplate.mutate(t)}
          saving={saveTemplate.isPending}
        />
      </PanelCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TemplateList({
  templates,
  loading,
  saving,
  onSave,
}: {
  templates: EmailTemplate[];
  loading: boolean;
  saving: boolean;
  onSave: (template: EmailTemplate) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading templates…</p>;
  if (templates.length === 0)
    return <p className="text-sm text-muted-foreground">No templates yet.</p>;

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <TemplateEditor key={template.id} template={template} saving={saving} onSave={onSave} />
      ))}
    </div>
  );
}

function TemplateEditor({
  template,
  saving,
  onSave,
}: {
  template: EmailTemplate;
  saving: boolean;
  onSave: (template: EmailTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(template);

  useEffect(() => setDraft(template), [template]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          className="text-left"
          onClick={() => setOpen((value) => !value)}
        >
          <p className="text-sm font-semibold">{template.name}</p>
          <p className="text-xs text-muted-foreground">{template.subject}</p>
        </button>
        <div className="flex items-center gap-3">
          <Switch
            checked={draft.enabled}
            onCheckedChange={(value) => {
              setDraft((prev) => ({ ...prev, enabled: value }));
              onSave({ ...draft, enabled: value });
            }}
          />
          <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? "Close" : "Edit"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <Field label="Subject">
            <Input
              value={draft.subject}
              onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))}
            />
          </Field>
          <Field label="Body">
            <Textarea
              rows={10}
              value={draft.body}
              onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="prime" size="sm" disabled={saving} onClick={() => onSave(draft)}>
              {saving ? "Saving…" : "Save template"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDraft(template)}>
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
