import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OutreachSafetyAudit = {
  ok: boolean;
  founder_protected?: boolean;
  baseline?: {
    auto_send_enabled_value: any;
    auto_send_is_strict_false: boolean;
    worker_guard_present_in_source: boolean;
    cron_check: "verified_disabled" | "unreadable_review_required" | "active_sender_found_unsafe";
    notes: string[];
  };
  summary?: {
    safety_status: "SAFE_BLOCKED" | "UNSAFE_REVIEW_REQUIRED";
    unsafe_reasons: string[];
    cron_check: string;
    total_pending: number;
    step2_pending: number;
    step4_pending: number;
    classification_counts: {
      orphan_followup: number;
      legacy_pending: number;
      valid_future_step_blocked: number;
      cancel_candidate: number;
      review_required: number;
    };
  };
  cleanup_preview?: {
    counters: Record<string, number>;
    apply_button: { enabled: boolean; label: string };
  };
  error?: string;
};

/**
 * Read-only outreach safety / queue brake audit.
 * Single source of truth shared by /founder/outreach/queue-audit and the
 * Command Centre safety panel. Performs ZERO mutations.
 */
export function useOutreachSafetyAudit() {
  return useQuery<OutreachSafetyAudit, Error>({
    queryKey: ["outreach-safety-audit"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in — founder/admin session required");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outreach-queue-audit`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      if (!res.ok) {
        throw new Error(json?.error || `Audit failed (${res.status})`);
      }
      return json as OutreachSafetyAudit;
    },
  });
}