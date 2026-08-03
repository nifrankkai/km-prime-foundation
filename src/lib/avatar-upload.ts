import { supabase } from "@/integrations/supabase/client";

/** Uploads a profile picture into the owner's folder and returns the storage path. */
export async function uploadAvatar(file: File | null, ownerId?: string): Promise<string | null> {
  if (!file?.size) return null;
  if (!file.type.startsWith("image/")) throw new Error("Profile picture must be an image.");
  if (file.size > 3_000_000) throw new Error("Profile picture must be under 3MB.");

  let userId = ownerId;
  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }
  if (!userId) throw new Error("You must be signed in.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}
