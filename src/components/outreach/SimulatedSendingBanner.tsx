import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OutboundStatus = {
  system_mode: string;
  provider_configured: boolean;
  test_passed_at: string | null;
  simulated: boolean;
};

type BusinessOutboundStatus = {
  business_name: string;
  system_mode: string;
  has_live_ready_inbox: boolean;
  live_ready_inbox_count: number;
  simulated: boolean;
};

/**
 * Hard warning shown anywhere outreach send activity is surfaced.
 * The outreach-send-worker currently only logs `send_simulated` events —
 * no real outbound email is transmitted. This banner makes that explicit
 * to the operator so simulated queue activity is never mistaken for live
 * outreach.
 */
export const SimulatedSendingBanner = ({
  compact = false,
  businessName,
}: { compact?: boolean; businessName?: string }) => {
  const [status, setStatus] = useState<OutboundStatus | null>(null);
  const [bizStatus, setBizStatus] = useState<BusinessOutboundStatus | null>(null);
  const [anyLiveReady, setAnyLiveReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_outbound_status");
      if (!cancelled && data) setStatus(data as unknown as OutboundStatus);
      if (businessName) {
        const { data: bd } = await supabase.rpc("get_business_outbound_status", { _business_name: businessName });
        if (!cancelled && bd) setBizStatus(bd as unknown as BusinessOutboundStatus);
      } else {
        const { count } = await supabase
          .from("inboxes")
          .select("id", { count: "exact", head: true })
          .eq("active", true)
          .eq("provider_type", "ionos_smtp")
          .eq("live_readiness", "live_ready");
        if (!cancelled) setAnyLiveReady((count ?? 0) > 0);
      }
    })();
    return () => { cancelled = true; };
  }, [businessName]);

  const systemLive = status && status.system_mode === "live"
    && status.provider_configured && !!status.test_passed_at;

  // Per-business: hide hard banner when business has a live-ready inbox.
  if (businessName) {
    if (!bizStatus) return null;
    if (bizStatus.has_live_ready_inbox || systemLive) {
      if (systemLive) return null;
      return (
        <div role="status" className="rounded-lg border border-primary/30 bg-primary/5 text-foreground p-3 flex gap-2 items-start text-xs">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p>
            <strong>{businessName}</strong> is in <strong>per-business live mode</strong> via{" "}
            {bizStatus.live_ready_inbox_count} Live Ready inbox
            {bizStatus.live_ready_inbox_count === 1 ? "" : "es"}. Real outbound email will be sent for this business. Other businesses without a Live Ready inbox remain simulated.
          </p>
        </div>
      );
    }
  } else if (anyLiveReady) {
    // Global page, but at least one inbox is live-ready → soften the warning.
    if (systemLive) return null;
    return (
      <div role="status" className="rounded-lg border border-primary/30 bg-primary/5 text-foreground p-3 flex gap-2 items-start text-xs">
        <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <p>
          System mode is still <strong>test</strong>, but at least one inbox is <strong>Live Ready</strong>. Campaigns assigned to that inbox will send <strong>real email</strong>. Other inboxes remain simulated.
        </p>
      </div>
    );
  }

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