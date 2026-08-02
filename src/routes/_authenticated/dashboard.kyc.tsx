import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { LicenseBanner } from "@/components/dashboard/license-banner";
import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { getKycStatus, submitKyc } from "@/lib/kyc.functions";
import { supabase } from "@/integrations/supabase/client";
import { titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/kyc")({
  component: KycPage,
});

const statusCopy: Record<string, string> = {
  not_submitted: "Verification is required before you can request a withdrawal.",
  pending: "Your documents are in review. We will update this page once a decision is made.",
  approved: "You are verified and can request withdrawals.",
  rejected: "Your submission was rejected. Please upload clearer documents and resubmit.",
};

async function uploadFile(userId: string, file: File, kind: string) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("kyc-documents").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

function KycPage() {
  const { data: overview } = useMemberOverview();
  const fetchKyc = useServerFn(getKycStatus);
  const submit = useServerFn(submitKyc);
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState<"national_id" | "passport">("national_id");

  const { data: kyc } = useQuery({ queryKey: ["kyc"], queryFn: () => fetchKyc() });

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("You must be signed in.");

      const idFile = form.get("idDocument") as File | null;
      const selfieFile = form.get("selfie") as File | null;
      const addressFile = form.get("addressProof") as File | null;
      if (!idFile?.size || !selfieFile?.size) {
        throw new Error("Government ID and selfie with ID are both required.");
      }

      const idDocumentPath = await uploadFile(userId, idFile, "id");
      const selfiePath = await uploadFile(userId, selfieFile, "selfie");
      const addressProofPath = addressFile?.size
        ? await uploadFile(userId, addressFile, "address")
        : undefined;

      return submit({ data: { documentType, idDocumentPath, selfiePath, addressProofPath } });
    },
    onSuccess: () => {
      toast.success("KYC submitted for review");
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const status = kyc?.status ?? "not_submitted";
  const locked = status === "pending" || status === "approved";

  return (
    <div>
      <LicenseBanner overview={overview} />
      <PanelCard
        title="KYC verification"
        description="Verify your identity to unlock withdrawal requests. Documents are stored privately and reviewed by an admin."
      >
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-primary" />
            <div>
              <p className="text-sm font-extrabold text-foreground">{titleCase(status)}</p>
              <p className="text-xs text-muted-foreground">{statusCopy[status]}</p>
            </div>
          </div>
          {kyc?.rejectionReason && (
            <p className="mt-3 text-xs font-semibold text-destructive">{kyc.rejectionReason}</p>
          )}
          {kyc?.submittedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Submitted {new Date(kyc.submittedAt).toLocaleString()}
            </p>
          )}
        </div>

        {!locked && (
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(new FormData(event.currentTarget));
            }}
          >
            <div>
              <Label>Document type</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(["national_id", "passport"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDocumentType(value)}
                    className={
                      documentType === value
                        ? "rounded-xl border-2 border-primary bg-primary-soft/50 p-4 text-left text-sm font-bold text-foreground"
                        : "rounded-xl border border-border p-4 text-left text-sm font-bold text-foreground hover:border-primary/40"
                    }
                  >
                    {value === "national_id" ? "Government ID" : "Passport"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="idDocument">ID or passport image</Label>
                <Input id="idDocument" name="idDocument" type="file" accept="image/*,.pdf" className="mt-2" required />
              </div>
              <div>
                <Label htmlFor="selfie">Selfie holding your ID</Label>
                <Input id="selfie" name="selfie" type="file" accept="image/*" className="mt-2" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="addressProof">Proof of address (optional)</Label>
                <Input id="addressProof" name="addressProof" type="file" accept="image/*,.pdf" className="mt-2" />
              </div>
            </div>

            <Button type="submit" variant="prime" size="lg" disabled={mutation.isPending}>
              {mutation.isPending ? "Uploading…" : "Submit for review"}
            </Button>
          </form>
        )}
      </PanelCard>
    </div>
  );
}
