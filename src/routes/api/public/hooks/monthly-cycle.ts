import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Monthly job — PV totals, rank re-evaluation, matrix + leadership commissions, wallet crediting. */
export const Route = createFileRoute("/api/public/hooks/monthly-cycle")({
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

        const { data, error } = await admin.rpc("process_monthly_cycle");
        if (error) {
          console.error("monthly cycle job failed", error.message);
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }

        const { data: credited, error: creditError } = await admin.rpc("credit_paid_commissions");
        if (creditError) {
          console.error("wallet crediting failed", creditError.message);
          return Response.json({ success: false, error: creditError.message }, { status: 500 });
        }

        return Response.json({ success: true, cycle: data, wallet: credited });
      },
    },
  },
});
