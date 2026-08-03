import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const IDLE_MS = 3 * 60 * 1000;
const WARN_MS = 30 * 1000;
const EVENTS = ["mousemove", "mousedown", "click", "keydown", "scroll", "touchstart"] as const;

export function InactivityGuard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [remaining, setRemaining] = useState<number | null>(null);
  const deadline = useRef(Date.now() + IDLE_MS);
  const loggingOut = useRef(false);

  const signOut = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }, [navigate, queryClient]);

  const reset = useCallback(() => {
    deadline.current = Date.now() + IDLE_MS;
    setRemaining(null);
  }, []);

  useEffect(() => {
    const onActivity = () => {
      // While the warning modal is up, only the explicit button resets the timer.
      if (deadline.current - Date.now() > WARN_MS) reset();
    };
    for (const event of EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      const left = deadline.current - Date.now();
      if (left <= 0) {
        setRemaining(0);
        void signOut();
      } else if (left <= WARN_MS) {
        setRemaining(Math.ceil(left / 1000));
      } else {
        setRemaining(null);
      }
    }, 500);

    return () => {
      for (const event of EVENTS) window.removeEventListener(event, onActivity);
      window.clearInterval(interval);
    };
  }, [reset, signOut]);

  if (remaining === null) return null;

  return (
    <div className="app-dark fixed inset-0 z-[100] grid place-items-center bg-background/80 p-5 backdrop-blur">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lift">
        <h2 className="text-lg">Still there?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You'll be logged out in{" "}
          <span className="figure-num text-foreground">{remaining}</span> seconds due to
          inactivity.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" onClick={reset} className="w-full">
            Stay logged in
          </Button>
          <Button type="button" variant="ghost" onClick={() => void signOut()} className="w-full">
            Log out now
          </Button>
        </div>
      </div>
    </div>
  );
}
