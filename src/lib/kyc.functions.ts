import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KycRecord = {
  status: "not_submitted" | "pending" | "approved" | "rejected";
  documentType: string;
  hasAddressProof: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
};

export const getKycStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KycRecord> => {
    const { data, error } = await context.supabase
      .from("kyc_submissions")
      .select("status, document_type, address_proof_path, rejection_reason, submitted_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        status: "not_submitted",
        documentType: "national_id",
        hasAddressProof: false,
        rejectionReason: null,
        submittedAt: null,
      };
    }
    return {
      status: data.status as KycRecord["status"],
      documentType: data.document_type,
      hasAddressProof: Boolean(data.address_proof_path),
      rejectionReason: data.rejection_reason,
      submittedAt: data.submitted_at,
    };
  });

const submitSchema = z.object({
  documentType: z.enum(["national_id", "passport"]),
  idDocumentPath: z.string().min(3).max(300),
  selfiePath: z.string().min(3).max(300),
  addressProofPath: z.string().max(300).optional(),
});

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ context, data }) => {
    const payload = {
      user_id: context.userId,
      status: "pending" as const,
      document_type: data.documentType,
      id_document_path: data.idDocumentPath,
      selfie_path: data.selfiePath,
      address_proof_path: data.addressProofPath ?? null,
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
    };

    const { data: existing } = await context.supabase
      .from("kyc_submissions")
      .select("id, status")
      .maybeSingle();

    if (existing) {
      if (existing.status === "approved") throw new Error("Your KYC is already approved.");
      const { error } = await context.supabase
        .from("kyc_submissions")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true };
    }

    const { error } = await context.supabase.from("kyc_submissions").insert(payload);
    if (error) throw error;
    return { ok: true };
  });
