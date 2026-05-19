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
  const [calendar, setCalendar] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);
  const [publishing, setPublishing] = useState<any>(null);
  const [bridge, setBridge] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [inbox, setInbox] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [competitor, setCompetitor] = useState<any>(null);
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
          const c = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-calendar-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setCalendar(await c.json());
          const ap = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-approval-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setApproval(await ap.json());
          const pub = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-publishing-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setPublishing(await pub.json());
          const br = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-scheduler-export-healthcheck`,
            { method: "POST", headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId }) });
          setBridge(await br.json());
          const en = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-engagement-flow-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setEngagement(await en.json());
          const inb = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-engagement-inbox-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setInbox(await inb.json());
          const an = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-analytics-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setAnalytics(await an.json());
          const ct = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-competitor-trend-healthcheck?business_id=${businessId}`,
            { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
          setCompetitor(await ct.json());
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
        {businessId && calendar && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1">Social Calendar</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Calendars: {calendar.calendars_count ?? 0} ({calendar.active_calendars_count ?? 0} active)</span>
              <span>Items: {calendar.calendar_items_count ?? 0}</span>
              <span>Need review: {calendar.items_needing_review ?? 0}</span>
              <span>Blocked: {calendar.items_blocked ?? 0}</span>
              <span>Queue ready: {calendar.items_ready_for_queue_review ?? 0}</span>
              <span>Cadence rules: {calendar.cadence_rules_count ?? 0}</span>
              <span>Open gaps: {calendar.gap_reviews_open ?? 0} ({calendar.critical_gaps ?? 0} crit)</span>
              <span>Missing assets: {calendar.missing_assets_count ?? 0}</span>
              <span>Approval flow: {calendar.ready_for_approval_flow ? "YES" : "no"}</span>
              <span>Queue ready: {calendar.ready_for_publish_queue ? "YES" : "no"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((calendar.cadence_rules_count ?? 0) === 0) return "Generate cadence rules.";
              if ((calendar.calendars_count ?? 0) === 0) return "Generate first social calendar.";
              if ((calendar.items_blocked ?? 0) > 0) return "Resolve blocked calendar items.";
              if ((calendar.missing_assets_count ?? 0) > 0) return "Add missing assets.";
              if ((calendar.items_needing_review ?? 0) > 0) return "Run founder approval on calendar items.";
              if (calendar.ready_for_publish_queue) return "Move approved items to publishing queue (later prompt).";
              return "Calendar ready.";
            })()}</p>
          </div>
        )}
        {businessId && approval && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1">Founder Approval Flow</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Pending: {approval.pending_reviews ?? 0}</span>
              <span>High risk: {approval.high_risk_pending ?? 0}</span>
              <span>Critical: {approval.critical_risk_pending ?? 0}</span>
              <span>Blocked: {approval.blocked_reviews ?? 0}</span>
              <span>Needs edit: {approval.needs_edit_reviews ?? 0}</span>
              <span>Approved: {approval.approved_reviews ?? 0}</span>
              <span>Batches: {approval.batch_count ?? 0}</span>
              <span>Rules: {approval.rules_count ?? 0}</span>
              <span>Content→queue: {approval.content_ready_for_queue ?? 0}</span>
              <span>Calendar→queue: {approval.calendar_items_ready_for_queue ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((approval.rules_count ?? 0) === 0) return "Generate approval rules.";
              if ((approval.pending_reviews ?? 0) === 0) return "Create approval reviews from drafts.";
              if ((approval.critical_risk_pending ?? 0) > 0) return "Review critical-risk items individually.";
              if ((approval.high_risk_pending ?? 0) > 0) return "Review high-risk items individually.";
              if ((approval.blocked_reviews ?? 0) > 0) return "Resolve blockers on blocked reviews.";
              if ((approval.pending_reviews ?? 0) > 0) return "Create low-risk approval batch.";
              return "Move approved items to publishing queue (next prompt).";
            })()}</p>
          </div>
        )}
        {businessId && publishing && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock size={12} /> Publishing Queue (provider execution locked)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Jobs: {publishing.publish_jobs_total ?? 0}</span>
              <span>Queued: {publishing.queued_jobs ?? 0}</span>
              <span>Provider locked: {publishing.provider_locked_jobs ?? 0}</span>
              <span>Blocked: {publishing.blocked_jobs ?? 0}</span>
              <span>Failed: {publishing.failed_jobs ?? 0}</span>
              <span>Batches: {publishing.batches_total ?? 0}</span>
              <span>Exports: {publishing.export_batches_total ?? 0}</span>
              <span>Connections: {publishing.provider_connections_count ?? 0}</span>
              <span>Gates locked: {(publishing.provider_gates_count ?? 0) - (publishing.unlocked_gates_count ?? 0)}</span>
              <span>Provider calls: {publishing.provider_calls_total ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((publishing.publish_jobs_total ?? 0) === 0) return "Preview publish queue and create internal jobs.";
              if ((publishing.blocked_jobs ?? 0) > 0) return "Review blocked jobs.";
              if ((publishing.batches_total ?? 0) === 0) return "Create publish batch.";
              if ((publishing.export_batches_total ?? 0) === 0) return "Create manual/operator export.";
              return "Keep provider execution locked until later prompts wire APIs.";
            })()}</p>
          </div>
        )}
        {businessId && bridge && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock size={12} /> Scheduler / Export Bridge (manual only — no provider API)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Batches: {bridge.export_batches_total ?? 0}</span>
              <span>Rows: {bridge.export_rows_total ?? 0}</span>
              <span>Ready: {bridge.export_ready_count ?? 0}</span>
              <span>Downloaded: {bridge.downloaded_count ?? 0}</span>
              <span>Manually scheduled: {bridge.manually_scheduled_count ?? 0}</span>
              <span>Blocked rows: {bridge.blocked_rows ?? 0}</span>
              <span>Validation failed: {bridge.validation_failed_count ?? 0}</span>
              <span>Operator open: {bridge.operator_tasks_open ?? 0}</span>
              <span>Provider calls: {bridge.provider_calls_total ?? 0}</span>
              <span>Ext schedules: {bridge.posts_scheduled_externally_total ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((bridge.export_batches_total ?? 0) === 0) return "Preview Metricool-ready export.";
              if ((bridge.export_ready_count ?? 0) === 0) return "Create scheduler export batch.";
              if ((bridge.validation_failed_count ?? 0) > 0) return "Validate export and fix blocked rows.";
              if ((bridge.downloaded_count ?? 0) === 0) return "Generate CSV and mark downloaded.";
              if ((bridge.operator_tasks_open ?? 0) === 0) return "Create operator pack.";
              return "Confirm manual scheduling after external upload.";
            })()}</p>
          </div>
        )}
        {businessId && engagement && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock size={12} /> Engagement / ManyChat (planning only — no DMs sent)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Keyword rules: {engagement.keyword_rules_total ?? 0} ({engagement.keyword_rules_approved ?? 0} approved)</span>
              <span>DM flows: {engagement.dm_flows_total ?? 0} ({engagement.dm_flows_approved ?? 0} approved)</span>
              <span>Manual exports: {engagement.manual_exports_total ?? 0}</span>
              <span>Manually configured: {engagement.manually_configured_count ?? 0}</span>
              <span>Manually live: {engagement.manually_live_count ?? 0}</span>
              <span>Validation failed: {engagement.validation_failed_count ?? 0}</span>
              <span>Blocked flows: {engagement.blocked_flows ?? 0}</span>
              <span>DMs sent: {engagement.dms_sent_total ?? 0}</span>
              <span>Comments sent: {engagement.comments_sent_total ?? 0}</span>
              <span>Provider calls: {engagement.provider_calls_total ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((engagement.keyword_rules_total ?? 0) === 0) return "Create first keyword trigger rule (e.g. CANDY).";
              if ((engagement.dm_flows_total ?? 0) === 0) return "Create first DM flow blueprint.";
              if ((engagement.dm_flows_approved ?? 0) === 0) return "Approve a DM flow internally.";
              if ((engagement.manual_exports_total ?? 0) === 0) return "Create ManyChat manual setup export.";
              if ((engagement.validation_failed_count ?? 0) > 0) return "Fix flow validation failures.";
              if ((engagement.manually_configured_count ?? 0) === 0) return "Configure flow manually in ManyChat, then confirm in Liftor.";
              return "Mark configured flows live after operator verifies them externally.";
            })()}</p>
          </div>
        )}
        {businessId && inbox && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock size={12} /> Engagement Inbox (capture only — no DMs/comments sent)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Events: {inbox.engagement_events_total ?? 0}</span>
              <span>Unclassified: {inbox.unclassified_count ?? 0}</span>
              <span>Unmatched: {inbox.unmatched_count ?? 0}</span>
              <span>Possible CRM: {inbox.possible_crm_matches ?? 0}</span>
              <span>Drafts pending: {inbox.reply_drafts_count ?? 0}</span>
              <span>Escalations open: {inbox.escalations_open ?? 0}</span>
              <span>Complaints: {inbox.complaints_detected ?? 0}</span>
              <span>Support: {inbox.support_detected ?? 0}</span>
              <span>Creator: {inbox.creator_interest_detected ?? 0}</span>
              <span>Lead: {inbox.lead_interest_detected ?? 0}</span>
              <span>Spam/abuse: {inbox.spam_abuse_count ?? 0}</span>
              <span>DMs sent: {inbox.dms_sent_total ?? 0}</span>
              <span>Comments sent: {inbox.comments_sent_total ?? 0}</span>
              <span>Provider calls: {inbox.provider_calls_total ?? 0}</span>
              <span>Ext actions: {inbox.external_actions_total ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((inbox.engagement_events_total ?? 0) === 0) return "Capture or import first engagement event.";
              if ((inbox.unclassified_count ?? 0) > 0) return `Classify ${inbox.unclassified_count} captured events.`;
              if ((inbox.unmatched_count ?? 0) > 0) return `Match ${inbox.unmatched_count} events to CRM.`;
              if ((inbox.complaints_detected ?? 0) > 0 || (inbox.support_detected ?? 0) > 0) return "Escalate complaints/support to the right human layer.";
              if ((inbox.reply_drafts_count ?? 0) === 0) return "Draft internal replies for high-priority events.";
              if ((inbox.test_data_count ?? 0) > 0) return "Purge test engagement before real use.";
              return "Inbox healthy — keep capturing and reviewing.";
            })()}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Next: upload business knowledge + manuals so the Social Brain can generate per-business content.
        </p>
        {businessId && analytics && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock size={12} /> Analytics / Learning (internal only — no provider/scrape)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Imports: {analytics.import_batches_total ?? 0}</span>
              <span>Metrics: {analytics.metrics_total ?? 0}</span>
              <span>Unmatched: {analytics.metrics_unmatched ?? 0}</span>
              <span>Summaries: {analytics.summaries_total ?? 0}</span>
              <span>Signals review: {analytics.learning_signals_needing_review ?? 0}</span>
              <span>Recs review: {analytics.recommendations_needing_review ?? 0}</span>
              <span>Top platform: {analytics.top_platform_by_engagement ?? "—"}</span>
              <span>Top type: {analytics.top_content_type ?? "—"}</span>
              <span>Data quality: {analytics.data_quality_score ?? 0}</span>
              <span>Provider calls: {analytics.provider_calls_total ?? 0}</span>
              <span>Scraped: {analytics.scraped_pages_total ?? 0}</span>
              <span>Fake metrics: {analytics.fake_metrics_created_total ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((analytics.metrics_total ?? 0) === 0) return "Import or paste first performance metrics.";
              if ((analytics.metrics_unmatched ?? 0) > 0) return `Match ${analytics.metrics_unmatched} metrics to content/campaign.`;
              if ((analytics.summaries_total ?? 0) === 0) return "Generate first performance summary.";
              if ((analytics.learning_signals_total ?? 0) === 0) return "Create learning signals from summaries.";
              if ((analytics.recommendations_needing_review ?? 0) > 0) return "Review pending strategy recommendations.";
              return "Analytics healthy — keep importing and reviewing.";
            })()}</p>
          </div>
        )}
        {businessId && competitor && (
          <div className="mt-3 p-3 rounded bg-secondary/40">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock size={12} /> Competitor / Trend (manual research only — no scraping/API)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <span>Competitors: {competitor.competitors_total ?? 0}</span>
              <span>Observations: {competitor.observations_total ?? 0}</span>
              <span>Obs review: {competitor.observations_needing_review ?? 0}</span>
              <span>Trends: {competitor.trends_total ?? 0}</span>
              <span>Trends review: {competitor.trends_needing_review ?? 0}</span>
              <span>Patterns: {competitor.patterns_total ?? 0}</span>
              <span>Patterns review: {competitor.patterns_needing_review ?? 0}</span>
              <span>Positioning reviews: {competitor.positioning_reviews_total ?? 0}</span>
              <span>Signals review: {competitor.market_learning_needing_review ?? 0}</span>
              <span>Recs: {competitor.recommendations_total ?? 0}</span>
              <span>Provider calls: {competitor.provider_calls_total ?? 0}</span>
              <span>Scraped: {competitor.scraped_pages_total ?? 0}</span>
              <span>Copied assets: {competitor.copied_assets_created_total ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Next: {(() => {
              if ((competitor.competitors_total ?? 0) === 0) return "Add first competitor profile.";
              if ((competitor.observations_total ?? 0) === 0) return "Add first competitor observation.";
              if ((competitor.trends_total ?? 0) === 0) return "Add first trend signal.";
              if ((competitor.patterns_total ?? 0) === 0) return "Generate competitor patterns.";
              if ((competitor.positioning_reviews_total ?? 0) === 0) return "Generate positioning review.";
              if ((competitor.market_learning_signals_total ?? 0) === 0) return "Create market learning signals.";
              if ((competitor.market_learning_needing_review ?? 0) > 0) return "Review market learning signals.";
              return "Review market recommendations.";
            })()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}