import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminAccess } from "@/hooks/use-admin-access";
import {
  executePlatformReset,
  getPlatformResetSettings,
  listSystemAuditLog,
  setKillSwitchEnabled,
  setPlatformResetPassword,
  INVALID_RESET_PASSWORD,
} from "@/lib/platform-reset.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/danger")({
  head: () => ({
    meta: [
      { title: "Danger Zone — KM Prime Admin" },
      {
        name: "description",
        content: "Super Administrator controls for the KM Prime platform reset kill switch.",
      },
    ],
  }),
  component: DangerZonePage,
});

const CONFIRM_PHRASE = "DELETE ALL DATA";

const DELETED = [
  "All member accounts (except your own Super Administrator account)",
  "All matrix positions and matrix tree data",
  "All PV records — personal PV, group PV, PV transactions and period history",
  "All rank history and current rank assignments",
  "All orders and order history",
  "All deposit and withdrawal requests",
  "All commission and bonus payout records",
  "All wallet balances and wallet transaction/audit logs",
  "All KYC submissions",
  "All support tickets and replies",
  "All referral relationships tied to deleted accounts",
];

const PRESERVED = [
  "Products, categories, PV values, stock and images",
  "Payment method configuration (enabled methods, instructions, addresses)",
  "Branding, logo, favicon and all CMS/site content",
  "Role and permission definitions",
  "Rank definitions and thresholds",
  "This permanent system audit log",
];

function DangerZonePage() {
  const { access, isLoading: accessLoading } = useAdminAccess();
  const isSuperAdmin = access?.roles.includes("super_admin") ?? false;

  const fetchSettings = useServerFn(getPlatformResetSettings);
  const fetchLog = useServerFn(listSystemAuditLog);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-reset-settings"],
    queryFn: () => fetchSettings(),
    enabled: isSuperAdmin,
  });
  const { data: auditLog } = useQuery({
    queryKey: ["system-audit-log"],
    queryFn: () => fetchLog(),
    enabled: isSuperAdmin,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["platform-reset-settings"] });
    void queryClient.invalidateQueries({ queryKey: ["system-audit-log"] });
  };

  if (accessLoading || (isSuperAdmin && isLoading)) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <PanelCard title="Danger zone" description="Super Administrator access only.">
        <p className="text-sm text-muted-foreground">
          Only a Super Administrator can view or configure the platform reset kill switch.
        </p>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6">
      <PasswordSection settings={settings} onDone={refresh} />
      <ToggleSection settings={settings} onDone={refresh} />
      <ResetSection settings={settings} onDone={refresh} />
      <PanelCard
        title="System audit log"
        description="Permanent record of kill switch changes and platform resets. Never cleared by a reset."
      >
        {(auditLog ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No system events recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {(auditLog ?? []).map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">{entry.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actorEmail ?? "Unknown admin"}
                  {entry.detail ? ` — ${entry.detail}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}

type Settings = { enabled: boolean; hasPassword: boolean; passwordSetAt: string | null } | undefined;

function PasswordSection({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const submit = useServerFn(setPlatformResetPassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submit({ data: { newPassword, confirmPassword, accountPassword } }),
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      setAccountPassword("");
      toast.success("Reset password saved. The kill switch is now enabled.");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard
      title={settings?.hasPassword ? "Change the reset password" : "Set the reset password"}
      description="Stored only as a bcrypt hash and verified server-side. The plaintext is never saved, logged or shown."
    >
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-background p-4">
        <KeyRound className="size-5 text-primary" />
        <p className="text-xs text-muted-foreground">
          {settings?.hasPassword
            ? `A reset password is set${settings.passwordSetAt ? ` (last changed ${new Date(settings.passwordSetAt).toLocaleString()})` : ""}. Entering a new one overwrites it.`
            : "No reset password is set yet, so the kill switch stays disabled and inert."}
        </p>
      </div>

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="reset-new">New reset password</Label>
          <Input
            id="reset-new"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-2"
            maxLength={128}
            required
          />
        </div>
        <div>
          <Label htmlFor="reset-confirm">Confirm reset password</Label>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-2"
            maxLength={128}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="reset-account">Your own account password (re-authentication)</Label>
          <Input
            id="reset-account"
            type="password"
            autoComplete="current-password"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            className="mt-2"
            maxLength={128}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="prime" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : settings?.hasPassword ? "Change password" : "Set password & enable"}
          </Button>
        </div>
      </form>
    </PanelCard>
  );
}

function ToggleSection({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const toggle = useServerFn(setKillSwitchEnabled);
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => toggle({ data: { enabled } }),
    onSuccess: () => {
      toast.success("Kill switch status updated");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const enabled = settings?.enabled ?? false;

  return (
    <PanelCard
      title="Kill switch status"
      description="Disabling hides the reset button everywhere without clearing the stored password hash."
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background p-5">
        <div>
          <p className="text-sm font-bold text-foreground">
            Kill switch:{" "}
            <span className={enabled ? "text-destructive" : "text-muted-foreground"}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {settings?.hasPassword
              ? "A reset password is stored, so this can be toggled freely."
              : "Set a reset password first — the switch cannot be enabled without one."}
          </p>
        </div>
        <Button
          variant={enabled ? "outline" : "prime"}
          disabled={mutation.isPending || (!enabled && !settings?.hasPassword)}
          onClick={() => mutation.mutate(!enabled)}
        >
          {enabled ? "Disable kill switch" : "Enable kill switch"}
        </Button>
      </div>
    </PanelCard>
  );
}

function ResetSection({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const run = useServerFn(executePlatformReset);
  const [step, setStep] = useState<"closed" | "scope" | "password" | "done">("closed");
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(0);

  const mutation = useMutation({
    mutationFn: () => run({ data: { password, phrase: CONFIRM_PHRASE } }),
    onSuccess: (result) => {
      setRemoved(result.accountsRemoved);
      setPassword("");
      setPhrase("");
      setError(null);
      setStep("done");
      onDone();
    },
    onError: (err: Error) => {
      setError(
        err.message.includes(INVALID_RESET_PASSWORD)
          ? "That reset password is incorrect. Nothing has been deleted — you can try again."
          : err.message,
      );
    },
  });

  const armed = settings?.enabled && settings?.hasPassword;

  return (
    <>
      <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-lg font-extrabold text-destructive">Danger zone — reset platform data</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Permanently deletes every member account and all of their records. Products, payment
              methods, branding, site content, roles and rank definitions are preserved. This cannot
              be undone.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {armed ? (
            <Button
              variant="destructive"
              onClick={() => {
                setPhrase("");
                setPassword("");
                setError(null);
                setStep("scope");
              }}
            >
              <AlertTriangle className="mr-2 size-4" />
              Reset Platform Data
            </Button>
          ) : (
            <p className="rounded-xl border border-dashed border-destructive/40 bg-background p-4 text-xs text-muted-foreground">
              The kill switch is inert. Set a reset password and enable it above before this action
              becomes available.
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={step === "scope"}
        onOpenChange={(open) => !open && setStep("closed")}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset all platform data?</DialogTitle>
            <DialogDescription>
              This will permanently delete ALL member accounts, transactions, orders, PV,
              commissions and related records. Products and branding will be preserved. This CANNOT
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-bold text-destructive">Deleted permanently</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {DELETED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold text-primary">Preserved</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {PRESERVED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <Label htmlFor="reset-phrase">
                Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to continue
              </Label>
              <Input
                id="reset-phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="mt-2"
                autoComplete="off"
                maxLength={40}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setStep("closed")}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={phrase !== CONFIRM_PHRASE}
              onClick={() => {
                setError(null);
                setStep("password");
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={step === "password"}
        onOpenChange={(open) => !open && !mutation.isPending && setStep("closed")}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Enter the reset password</DialogTitle>
            <DialogDescription>
              The password is verified server-side against its stored hash. Nothing is deleted until
              it matches.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="reset-password">Reset password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
              maxLength={128}
            />
            {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setStep("closed")}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending || password.length === 0}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Wiping platform data…" : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={step === "done"} onOpenChange={(open) => !open && setStep("closed")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Platform data has been reset.</DialogTitle>
            <DialogDescription>
              {removed} member account{removed === 1 ? "" : "s"} and all related records were
              deleted. Your Super Administrator account was kept and returned to a clean baseline.
              The action is recorded in the system audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
            <CheckCircle2 className="size-5 text-primary" />
            <p className="text-xs text-muted-foreground">
              Products, payment methods, branding and definitions were preserved.
            </p>
          </div>
          <DialogFooter>
            <Button variant="prime" onClick={() => setStep("closed")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
