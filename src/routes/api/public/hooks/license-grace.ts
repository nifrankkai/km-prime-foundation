import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Daily licence sweep — starts the 7-day grace period, logs reminders, expires licences. */
export const Route = createFileRoute("/api/public/hooks/license-grace")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "");

        if (!token || token !== process.env["SUPABASE_ANON_KEY"]) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await admin.rpc("process_license_grace");
        if (error) {
          console.error("licence grace job failed", error.message);
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }

        // Email sending is stubbed for now: reminders are logged in license_reminders.
        return Response.json({ success: true, result: data });
      },
    },
  },
});
