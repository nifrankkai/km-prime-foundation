import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Weekly job — refreshes PV totals and credits approved commissions to member wallets. */
export const Route = createFileRoute("/api/public/hooks/weekly-cycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "");

        const allowed = [
          process.env["SUPABASE_ANON_KEY"],
          process.env["SUPABASE_PUBLISHABLE_KEY"],
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
        ].filter(Boolean);

        if (!token || !allowed.includes(token)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await admin.rpc("process_weekly_cycle");
        if (error) {
          console.error("weekly cycle job failed", error.message);
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }
        return Response.json({ success: true, result: data });
      },
    },
  },
});
