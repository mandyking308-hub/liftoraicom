import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SocialAutopilotCommandCentreBlock() {
  const [data, setData] = useState<any>(null);
  const [brain, setBrain] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [factory, setFactory] = useState<any>(null);
  const businessId = typeof window !== "undefined" ? localStorage.getItem("liftor.activeBusinessId") || "" : "";

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-autopilot-healthcheck${businessId ? `?business_id=${businessId}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
        setData(await res.json());
        if (businessId) {
          const b = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-brain-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setBrain(await b.json());
          const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-profile-readiness-check?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setReadiness(await r.json());
          const f = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-content-factory-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setFactory(await f.json());
        }
      } catch { /* ignore */ }
    })();
  }, [businessId]);

  const stat = (label: string, value: any) => (
    <div className="p-2 rounded bg-secondary/40">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-semibold">{value ?? "—"}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone size={16} /> Social Autopilot
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            <Lock size={10} className="mr-1" /> Provider execution LOCKED
          </Badge>
          <Link to="/founder/social-autopilot"><Button size="sm" variant="outline">Open</Button></Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {stat("Mode", data?.automation_mode ?? "approval_required")}
          {stat("Accounts", `${data?.connected_accounts_count ?? 0}/${data?.accounts_count ?? 0}`)}
          {stat("Assets", data?.assets_count)}
          {stat("Drafts", data?.content_count)}
          {stat("Need approval", data?.pending_content_approvals)}
          {stat("Blocked jobs", data?.publish_jobs_blocked)}
          {stat("Inbox", data?.inbox_messages_count)}
          {stat("Reply drafts", data?.reply_jobs_pending_approval)}
          {stat("Perf logs", data?.performance_logs_count)}
          {stat("Test data", data?.test_data_count)}
          {stat("Ext publish", "OFF")}
          {stat("DM send", "OFF")}
        </div>
        {businessId && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1">Social Brain</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Status: <Badge variant="secondary">{brain?.profile_status ?? "no_profile"}</Badge></span>
              <span>Sources: {brain?.sources_count ?? 0} ({brain?.approved_sources_count ?? 0} approved)</span>
              <span>Confidence: {brain?.confidence_score ?? 0}</span>
              <span>Settings applied: {brain?.settings_applied ? "yes" : "no"}</span>
              <span>Ready: {brain?.ready_for_content_generation ? "YES" : "no"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Next: {(() => {
                if (!brain || !brain.profile_exists) return "Register manuals/assets → run extraction → generate Social Brain profile.";
                if (brain.profile_status === "draft" || brain.profile_status === "needs_review") return "Review & approve Social Brain profile.";
                if (brain.profile_status === "approved") return "Apply Social Brain to settings.";
                if (brain.ready_for_content_generation) return "Generate first content pack (Prompt 3).";
                return "Address missing inputs and regenerate.";
              })()}
            </p>
          </div>
        )}
        {businessId && readiness && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1">Social Operating Profile</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Confidence: {readiness.confidence_score ?? 0}</span>
              <span>Pillars: {readiness.approved_pillars_count ?? 0}/{readiness.content_pillars_count ?? 0}</span>
              <span>Active platforms: {readiness.active_platform_rules_count ?? 0}</span>
              <span>Offers: {readiness.offer_mappings_count ?? 0}</span>
              <span>Open risks: {readiness.risk_flags_open ?? 0} ({readiness.critical_risk_flags ?? 0} crit)</span>
              <span>Content gen ready: {readiness.ready_for_content_generation ? "YES" : "no"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Next: {(() => {
                if (!readiness.profile_exists || (readiness.content_pillars_count ?? 0) === 0) return "Generate Social Operating Profile.";
                if ((readiness.critical_risk_flags ?? 0) > 0) return "Resolve critical risk flags.";
                if ((readiness.approved_pillars_count ?? 0) < 3) return "Review & approve content pillars.";
                if ((readiness.active_platform_rules_count ?? 0) === 0) return "Activate at least one platform rule.";
                if ((readiness.offer_mappings_count ?? 0) === 0) return "Add offer/pricing/proof.";
                if (readiness.ready_for_content_generation) return "Proceed to content pack generation (Prompt 4).";
                return "Resolve missing inputs.";
              })()}
            </p>
          </div>
        )}
        {businessId && factory && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1">Content Factory</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Packs: {factory.content_packs_count ?? 0}</span>
              <span>Drafts: {factory.draft_items_count ?? 0}</span>
              <span>Need review: {factory.items_needing_review ?? 0}</span>
              <span>Blocked: {factory.blocked_content_count ?? 0}</span>
              <span>Missing assets: {factory.missing_asset_count ?? 0}</span>
              <span>Variants: {factory.variants_count ?? 0}</span>
              <span>Hooks/captions: {factory.hooks_bank_count ?? 0}</span>
              <span>Quality warn.: {factory.compliance_warning_count ?? 0}</span>
              <span>Ready→calendar: {factory.ready_for_calendar_generation ? "YES" : "no"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {factory.next_action}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Next: upload business knowledge + manuals so the Social Brain can generate per-business content.
        </p>
      </CardContent>
    </Card>
  );
}