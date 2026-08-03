import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EyeOff, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logImpersonatedAction } from "@/lib/member-admin.functions";
import {
  endImpersonation,
  readImpersonation,
  type ImpersonationState,
} from "@/lib/impersonation";

/**
 * Persistent banner shown while staff act on a member's behalf. Every screen
 * visited during the session is written to the permanent audit trail, tagged
 * with both the administrator and the impersonated member.
 */
export function ImpersonationBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logAction = useServerFn(logImpersonatedAction);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [state, setState] = useState<ImpersonationState | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setState(readImpersonation());
  }, []);

  useEffect(() => {
    if (!state) return;
    void logAction({
      data: {
        adminId: state.adminId,
        adminLabel: state.adminLabel,
        action: "page_view",
        detail: `${state.adminLabel} viewed ${pathname} as ${state.memberLabel}`,
      },
    }).catch(() => undefined);
  }, [state, pathname, logAction]);

  if (!state) return null;

  async function exit() {
    if (!state) return;
    setExiting(true);
    try {
      await logAction({
        data: {
          adminId: state.adminId,
          adminLabel: state.adminLabel,
          action: "session_ended",
          detail: `${state.adminLabel} ended the impersonated session for ${state.memberLabel}`,
        },
      }).catch(() => undefined);
      await endImpersonation(state);
      setState(null);
      queryClient.clear();
      await navigate({ to: "/console-x7q9f4k2m8/members", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not return to your admin session");
      setExiting(false);
    }
  }

  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-3 border-b border-reward/40 bg-reward/15 px-4 py-2.5 text-sm backdrop-blur">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <EyeOff className="size-4 shrink-0" aria-hidden />
        <span>
          You are viewing as <strong>{state.memberLabel}</strong> — {state.adminLabel}. All actions
          are recorded against both identities.
        </span>
      </p>
      <Button size="sm" variant="outline" onClick={() => void exit()} disabled={exiting}>
        <LogOut className="size-3.5" /> {exiting ? "Returning…" : "Exit to admin"}
      </Button>
    </div>
  );
}
