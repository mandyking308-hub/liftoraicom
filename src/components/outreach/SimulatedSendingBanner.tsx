import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OutboundStatus = {
  system_mode: string;
  provider_configured: boolean;
  test_passed_at: string | null;
  simulated: boolean;
};

/**
 * Hard warning shown anywhere outreach send activity is surfaced.
 * The outreach-send-worker currently only logs `send_simulated` events —
 * no real outbound email is transmitted. This banner makes that explicit
 * to the operator so simulated queue activity is never mistaken for live
 * outreach.
 */
export const SimulatedSendingBanner = ({ compact = false }: { compact?: boolean }) => {
  const [status, setStatus] = useState<OutboundStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_outbound_status");
      if (!cancelled && data) setStatus(data as unknown as OutboundStatus);
    })();
    return () => { cancelled = true; };
  }, []);

  // Until we know otherwise, assume simulated — fail closed.
  const simulated = !status || status.simulated || !status.provider_configured || !status.test_passed_at;
  if (!simulated) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive-foreground p-4 flex gap-3 items-start"
    >
      <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-destructive">
          ⚠️ Outbound sending is currently in simulated mode
        </p>
        {!compact && (
          <p className="text-xs text-destructive/90 leading-relaxed">
            Campaigns may queue and mark messages as <strong>sent</strong> inside Liftor,
            but <strong>no real email leaves the system</strong>. Do not treat campaign
            activity as live outreach until outbound email sending is properly wired and
            tested. The system can only be flipped to <code>live</code> mode after a real
            outbound provider is configured and a verified test send has succeeded.
          </p>
        )}
      </div>
    </div>
  );
};

export default SimulatedSendingBanner;