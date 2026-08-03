import { supabase } from "@/integrations/supabase/client";

/** Uploads an optional support attachment into the member's own folder. */
export async function uploadSupportAttachment(file: File | null): Promise<string | null> {
  if (!file?.size) return null;
  if (file.size > 5_000_000) throw new Error("Attachment must be under 5MB.");

  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/ticket-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("support-attachments")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}
