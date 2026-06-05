import { Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchActiveWindow,
  fetchKillSwitch,
  fetchMyWorkerProfile,
  logAuditEvent,
  portalForRole,
  startSession,
  endSession,
  sessionExpiresAt,
  type AccessWindow,
  type PortalType,
} from "@/lib/humanWorkforce";

interface Props {
  portal: PortalType;
  loginPath: string;
  children: React.ReactNode;
}

type Status = "checking" | "ok" | "no_window" | "wrong_portal" | "killed" | "not_worker";

export default function WorkerRoute({ portal, loginPath, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [worker, setWorker] = useState<any>(null);
  const [window, setWindow] = useState<AccessWindow | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    (async () => {
      const profile = await fetchMyWorkerProfile();
      if (!profile) { setStatus("not_worker"); return; }
      const portalForWorker = portalForRole(profile.role);
      if (portalForWorker !== portal) { setStatus("wrong_portal"); return; }
      const ks = await fetchKillSwitch();
      if (ks.active) {
        setStatus("killed");
        await logAuditEvent({ workerId: profile.id, eventType: "blocked_kill_switch", portalType: portal });
        await supabase.auth.signOut();
        return;
      }
      const win = await fetchActiveWindow(profile.id, portal);
      if (!win) {
        setStatus("no_window");
        await logAuditEvent({ workerId: profile.id, eventType: "blocked_no_window", portalType: portal });
        await supabase.auth.signOut();
        return;
      }
      const session = await startSession(profile.id, win.id);
      sessionIdRef.current = session?.id ?? null;
      await logAuditEvent({ workerId: profile.id, eventType: "login", portalType: portal, metadata: { window_id: win.id } });
      setWorker(profile);
      setWindow(win);
      setStatus("ok");
    })();
  }, [user, authLoading, portal]);

  // expiry watchdog
  useEffect(() => {
    if (status !== "ok" || !window) return;
    const loginAt = new Date();
    const expiry = sessionExpiresAt(loginAt, window);
    const tick = setInterval(async () => {
      const now = new Date();
      if (now >= expiry) {
        clearInterval(tick);
        if (sessionIdRef.current) await endSession(sessionIdRef.current, "expired");
        await logAuditEvent({ workerId: worker?.id, eventType: "session_expired", portalType: portal });
        toast.error("Your access window has ended. Please contact Mandy.");
        await supabase.auth.signOut();
        return;
      }
      // also re-check kill switch + revocation
      const ks = await fetchKillSwitch();
      const win = await fetchActiveWindow(worker.id, portal);
      if (ks.active || !win) {
        clearInterval(tick);
        if (sessionIdRef.current) await endSession(sessionIdRef.current, "forced_logout");
        toast.error(ks.active ? "Worker access has been disabled by Mandy." : "Your access window was revoked.");
        await supabase.auth.signOut();
      }
    }, 30_000);
    return () => clearInterval(tick);
  }, [status, window, worker, portal]);

  if (authLoading || (user && status === "checking")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (!user) return <Navigate to={loginPath} replace />;
  if (status === "not_worker" || status === "wrong_portal") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Access denied</h1>
        <p className="text-muted-foreground max-w-md">This portal is for assigned workers only. Please contact Mandy if you believe this is an error.</p>
      </div>
    );
  }
  if (status === "no_window" || status === "killed") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">
          {status === "killed" ? "Worker access disabled" : "No active access window"}
        </h1>
        <p className="text-muted-foreground max-w-md">Please contact Mandy.</p>
      </div>
    );
  }

  return <>{children}</>;
}

export { Props as WorkerRouteProps };