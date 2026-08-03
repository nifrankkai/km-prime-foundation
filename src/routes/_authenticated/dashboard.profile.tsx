import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Lock, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { LicenseBanner } from "@/components/dashboard/license-banner";
import { PanelCard } from "@/components/dashboard/panel-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { uploadAvatar } from "@/lib/avatar-upload";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile settings — KM Prime" }] }),
  component: ProfileSettingsPage,
});

const LOCKED_FIELDS = [
  { key: "username", label: "Username", subject: "Request to update my username" },
  {
    key: "mobileMoneyNumber",
    label: "Withdrawal phone number (Mobile Money)",
    subject: "Request to update my withdrawal phone number",
  },
  {
    key: "usdtAddress",
    label: "USDT wallet address",
    subject: "Request to update my USDT wallet address",
  },
] as const;

function ProfileSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: overview } = useMemberOverview();
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setFullName(profile.fullName);
  }, [profile]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const mutation = useMutation({
    mutationFn: async () => {
      const avatarPath = await uploadAvatar(file);
      return save({ data: { fullName: fullName.trim(), avatarPath } });
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["member-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function requestChange(subject: string) {
    void navigate({
      to: "/dashboard/support",
      search: { subject, category: "account_info_change", new: true },
    });
  }

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  const initials = (profile.fullName || profile.email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <LicenseBanner overview={overview} />

      <PanelCard
        title="Profile settings"
        description="Update the details you control. Sensitive payout and identity fields are locked for your protection."
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (fullName.trim().length < 2) {
              toast.error("Enter your full name");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-20 border border-border">
              <AvatarImage src={preview ?? profile.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar">Profile picture</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="mt-2 max-w-xs"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, up to 3MB.</p>
            </div>
          </div>

          <div className="max-w-md">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              className="mt-2"
              value={fullName}
              maxLength={100}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="prime" disabled={mutation.isPending}>
            <UserRound /> {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </PanelCard>

      <PanelCard
        title="Locked details"
        description="These fields can only be changed by an administrator. Open a request and support will handle it."
      >
        <div className="space-y-3">
          <LockedRow
            label="Email address"
            value={profile.email}
            onRequest={() => requestChange("Request to update my email address")}
          />
          {LOCKED_FIELDS.map((field) => (
            <LockedRow
              key={field.key}
              label={field.label}
              value={profile[field.key] ?? "Not set"}
              onRequest={() => requestChange(field.subject)}
            />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <KeyRound className="size-3.5" /> Withdrawal PIN
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                {profile.hasPin ? (
                  <>
                    <ShieldCheck className="size-4 text-primary" /> PIN is set
                  </>
                ) : (
                  <>Not set — you will be asked to create one before your first withdrawal</>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestChange("Request to reset my withdrawal PIN")}
            >
              Request reset
            </Button>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}

function LockedRow({
  label,
  value,
  onRequest,
}: {
  label: string;
  value: string;
  onRequest: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Lock className="size-3.5" /> {label}
        </p>
        <p className="mt-1 break-all text-sm font-semibold">{value}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRequest}>
        Request change
      </Button>
    </div>
  );
}
