import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  SocialKnowledgeSourcePanel,
  SocialKnowledgeExtractionPanel,
  SocialBrainProfilePanel,
  SocialBrainApprovalPanel,
  SocialBrainSettingsApplyPanel,
  SocialBrainHealthPanel,
} from "@/components/founder/social-autopilot/SocialBrainPanels";
import {
  SocialProfileGeneratorPanel,
  SocialContentPillarsPanel,
  SocialPlatformRulesPanel,
  SocialOfferMappingsPanel,
  SocialRiskFlagsPanel,
  SocialProfileReadinessPanel,
  SocialProfileVersionHistoryPanel,
} from "@/components/founder/social-autopilot/SocialProfilePanels";
import { SocialContentFactoryDashboard } from "@/components/founder/social-autopilot/SocialContentFactoryPanels";
import { SocialCampaignEngineDashboard } from "@/components/founder/social-autopilot/SocialCampaignEnginePanels";
import { SocialCalendarDashboard } from "@/components/founder/social-autopilot/SocialCalendarPanels";
import { SocialApprovalDashboard } from "@/components/founder/social-autopilot/SocialApprovalPanels";
import { SocialPublishingDashboard } from "@/components/founder/social-autopilot/SocialPublishingPanels";
import { SocialSchedulerBridgeDashboard } from "@/components/founder/social-autopilot/SocialSchedulerBridgePanels";
import { SocialEngagementFlowDashboard } from "@/components/founder/social-autopilot/SocialEngagementFlowPanels";
import { SocialEngagementInboxDashboard } from "@/components/founder/social-autopilot/SocialEngagementInboxPanels";
import { SocialAnalyticsDashboard } from "@/components/founder/social-autopilot/SocialAnalyticsPanels";
import { SocialCompetitorTrendDashboard } from "@/components/founder/social-autopilot/SocialCompetitorTrendPanels";
import { SocialViralRadarDashboard } from "@/components/founder/social-autopilot/SocialViralRadarPanels";
import { WebsiteFunnelDashboard } from "@/components/founder/social-autopilot/WebsiteFunnelPanels";
import { PaidMediaDashboard } from "@/components/founder/social-autopilot/PaidMediaPanels";

const TAB_BY_PATH: Record<string, string> = {
  "/founder/social-autopilot": "dashboard",
  "/founder/social-autopilot/accounts": "accounts",
  "/founder/social-autopilot/assets": "assets",
  "/founder/social-autopilot/content": "content",
  "/founder/social-autopilot/calendar": "calendar",
  "/founder/social-autopilot/publishing": "publishing",
  "/founder/social-autopilot/inbox": "inbox",
  "/founder/social-autopilot/replies": "replies",
  "/founder/social-autopilot/engagement": "engagement",
  "/founder/social-autopilot/performance": "performance",
  "/founder/social-autopilot/analytics": "analytics",
  "/founder/social-autopilot/funnels": "funnels",
  "/founder/social-autopilot/ads": "ads",
  "/founder/social-autopilot/settings": "settings",
};

const SafetyBanner = () => (
  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-start gap-2">
    <Lock size={14} className="mt-0.5" />
    <div>
      <p className="font-semibold">Provider execution locked</p>
      <p className="text-muted-foreground mt-0.5">
        Social Autopilot is in foundation mode. No posts, DMs, comments or provider API calls are sent.
        All actions stay internal until provider gates are configured and the founder approves go-live.
      </p>
    </div>
  </div>
);

function useBusinessId() {
  const [businessId, setBusinessId] = useState<string>(
    () => localStorage.getItem("liftor.activeBusinessId") || ""
  );
  useEffect(() => {
    if (businessId) localStorage.setItem("liftor.activeBusinessId", businessId);
  }, [businessId]);
  return [businessId, setBusinessId] as const;
}

function BusinessSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <label className="text-xs text-muted-foreground">Selected business (UUID)</label>
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="business_id uuid" />
        </div>
        <p className="text-xs text-muted-foreground">Per-business spine — Neon Candy is just the first test.</p>
      </CardContent>
    </Card>
  );
}

function DashboardPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    const { data: d } = await supabase.functions.invoke("social-autopilot-healthcheck", {
      body: {},
      // healthcheck reads business_id from query param; fall back to no filter
    });
    // re-invoke via direct URL with business_id query
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-autopilot-healthcheck${businessId ? `?business_id=${businessId}` : ""}`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
      setData(await res.json());
    } catch {
      setData(d);
    }
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const tile = (label: string, value: any, hint?: string) => (
    <div className="p-3 rounded bg-secondary/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value ?? "—"}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );

  const nextAction = useMemo(() => {
    if (!data) return "Run healthcheck.";
    if (!data.settings_exist) return "Create automation settings for this business.";
    if ((data.accounts_count ?? 0) === 0) return "Register at least one social account (planned/not_connected is fine).";
    if ((data.assets_count ?? 0) === 0) return "Upload first social asset (video/image/carousel).";
    if ((data.content_count ?? 0) === 0) return "Generate first content drafts from business knowledge.";
    if ((data.pending_content_approvals ?? 0) > 0) return `Approve ${data.pending_content_approvals} content drafts.`;
    return "Continue Prompt 2 — Business Knowledge → Social Brain connector.";
  }, [data]);

  return (
    <div className="space-y-4">
      <SafetyBanner />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Shield size={16} /> Social Autopilot Status</CardTitle>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tile("Automation mode", data?.automation_mode ?? "approval_required")}
            {tile("Accounts", data?.accounts_count, `${data?.connected_accounts_count ?? 0} connected`)}
            {tile("Assets", data?.assets_count)}
            {tile("Content drafts", data?.content_count, `${data?.pending_content_approvals ?? 0} need approval`)}
            {tile("Publish jobs", data?.publish_jobs_count, `${data?.publish_jobs_blocked ?? 0} blocked`)}
            {tile("Inbox", data?.inbox_messages_count)}
            {tile("Reply drafts", data?.reply_jobs_count, `${data?.reply_jobs_pending_approval ?? 0} need approval`)}
            {tile("Performance logs", data?.performance_logs_count)}
            {tile("Test data", data?.test_data_count, "purge before go-live")}
            {tile("External publish", "LOCKED")}
            {tile("DM send", "LOCKED")}
            {tile("Provider execution", "LOCKED")}
          </div>
          <div className="mt-4 p-3 rounded bg-primary/10 border border-primary/30 text-sm">
            <p className="font-semibold flex items-center gap-2"><AlertTriangle size={14} /> Next recommended action</p>
            <p className="text-muted-foreground mt-1">{nextAction}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Future execution buttons</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Button disabled variant="outline">Publish queue (disabled — Provider execution not enabled.)</Button>
          <Button disabled variant="outline">Send reply drafts (disabled — Provider execution not enabled.)</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_accounts").select("*").eq("business_id", businessId).then(({ data }) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Social Accounts</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No accounts registered yet. Register via Prompt 2 connector.</p> :
          <div className="space-y-2">{rows.map(r => (
            <div key={r.id} className="p-2 rounded bg-secondary/40 flex justify-between text-sm">
              <span>{r.platform} · {r.handle ?? "—"}</span>
              <Badge variant="secondary">{r.connection_status}</Badge>
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

function GenericListPanel({ table, businessId, title }: { table: string; businessId: string; title: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from(table).select("id", { count: "exact", head: true }).eq("business_id", businessId)
      .then(({ count: c }: any) => setCount(c ?? 0));
  }, [businessId, table]);
  return (
    <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {count === null ? "Select a business to load." : `${count} record${count === 1 ? "" : "s"} for this business.`}
        <p className="mt-2 text-xs">Foundation table ready. UI editor ships in later prompts.</p>
      </CardContent></Card>
  );
}

function SettingsPanel({ businessId }: { businessId: string }) {
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_automation_settings").select("*").eq("business_id", businessId).maybeSingle()
      .then(({ data }) => setRow(data));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Automation Settings</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {!businessId ? <p className="text-muted-foreground">Set a business above.</p> :
         !row ? <p className="text-muted-foreground">No settings row yet. Default = approval_required. Create row via Prompt 2.</p> :
         <div className="grid grid-cols-2 gap-2 text-xs">
           <span>Mode</span><span className="font-mono">{row.social_automation_mode}</span>
           <span>Cold DMs</span><span>{row.cold_dm_allowed ? "ON" : "OFF (locked)"}</span>
           <span>Auto publish</span><span>{row.auto_publish_allowed ? "ON" : "OFF (locked)"}</span>
           <span>Auto reply</span><span>{row.auto_reply_allowed ? "ON" : "OFF (locked)"}</span>
           <span>Rehearsal mode</span><span>{row.rehearsal_mode_enabled ? "ON" : "OFF"}</span>
         </div>}
      </CardContent></Card>
  );
}

const TAB_LABELS: Array<[string, string, string]> = [
  ["dashboard", "Dashboard", "/founder/social-autopilot"],
  ["accounts", "Accounts", "/founder/social-autopilot/accounts"],
  ["assets", "Assets", "/founder/social-autopilot/assets"],
  ["content", "Content", "/founder/social-autopilot/content"],
  ["calendar", "Calendar", "/founder/social-autopilot/calendar"],
  ["publishing", "Publishing", "/founder/social-autopilot/publishing"],
  ["inbox", "Inbox", "/founder/social-autopilot/inbox"],
  ["replies", "Replies", "/founder/social-autopilot/replies"],
  ["engagement", "Engagement", "/founder/social-autopilot/engagement"],
  ["performance", "Performance", "/founder/social-autopilot/performance"],
  ["analytics", "Analytics", "/founder/social-autopilot/analytics"],
  ["funnels", "Funnels", "/founder/social-autopilot/funnels"],
  ["ads", "Ads", "/founder/social-autopilot/ads"],
  ["settings", "Settings", "/founder/social-autopilot/settings"],
];

export default function SocialAutopilotPage() {
  const loc = useLocation();
  const initial = TAB_BY_PATH[loc.pathname] ?? "dashboard";
  const [tab, setTab] = useState(initial);
  useEffect(() => { setTab(TAB_BY_PATH[loc.pathname] ?? "dashboard"); }, [loc.pathname]);
  const [businessId, setBusinessId] = useBusinessId();

  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Social Autopilot</h1>
          <p className="text-sm text-muted-foreground">
            Multi-business social spine · provider-independent · founder-approved · fail-closed.
          </p>
        </div>
        <BusinessSelector value={businessId} onChange={setBusinessId} />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            {TAB_LABELS.map(([k, label, href]) => (
              <TabsTrigger key={k} value={k} asChild>
                <Link to={href}>{label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="dashboard"><DashboardPanel businessId={businessId} /></TabsContent>
          <TabsContent value="accounts"><AccountsPanel businessId={businessId} /></TabsContent>
          <TabsContent value="assets"><GenericListPanel table="social_assets" businessId={businessId} title="Social Asset Library" /></TabsContent>
          <TabsContent value="content"><SocialContentFactoryDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="calendar"><SocialCalendarDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="publishing"><GenericListPanel table="social_publish_jobs" businessId={businessId} title="Publishing Queue (locked)" /></TabsContent>
          <TabsContent value="inbox"><SocialEngagementInboxDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="replies"><GenericListPanel table="social_reply_jobs" businessId={businessId} title="Reply Drafts (locked)" /></TabsContent>
          <TabsContent value="engagement"><SocialEngagementFlowDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="performance"><GenericListPanel table="social_performance_logs" businessId={businessId} title="Performance Logs" /></TabsContent>
          <TabsContent value="analytics"><SocialAnalyticsDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="funnels"><WebsiteFunnelDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="ads"><PaidMediaDashboard businessId={businessId} /></TabsContent>
          <TabsContent value="settings"><SettingsPanel businessId={businessId} /></TabsContent>
        </Tabs>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Business Knowledge → Social Brain</h2>
          <SocialBrainHealthPanel businessId={businessId} />
          <SocialKnowledgeSourcePanel businessId={businessId} />
          <SocialKnowledgeExtractionPanel businessId={businessId} />
          <SocialBrainProfilePanel businessId={businessId} />
          <SocialBrainApprovalPanel businessId={businessId} />
          <SocialBrainSettingsApplyPanel businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Social Operating Profile</h2>
          <SocialProfileReadinessPanel businessId={businessId} />
          <SocialProfileGeneratorPanel businessId={businessId} />
          <div className="grid md:grid-cols-2 gap-4">
            <SocialContentPillarsPanel businessId={businessId} />
            <SocialPlatformRulesPanel businessId={businessId} />
            <SocialOfferMappingsPanel businessId={businessId} />
            <SocialRiskFlagsPanel businessId={businessId} />
          </div>
          <SocialProfileVersionHistoryPanel businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Campaign + Offer Content Engine</h2>
          <SocialCampaignEngineDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Founder Approval Flow</h2>
          <SocialApprovalDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Publishing Queue + Fail-Closed Provider Layer</h2>
          <SocialPublishingDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Scheduler Bridge / Metricool + Operator Export</h2>
          <SocialSchedulerBridgeDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">ManyChat / Keyword + DM Flow Planner</h2>
          <SocialEngagementFlowDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Social Engagement Inbox</h2>
          <SocialEngagementInboxDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Social Analytics + Learning Signals</h2>
          <SocialAnalyticsDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Competitor Watch + Trend Intelligence</h2>
          <SocialCompetitorTrendDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Viral Opportunity Radar / Viral Conversion Intelligence</h2>
          <SocialViralRadarDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Website / Funnel / Lead Magnet Engine</h2>
          <WebsiteFunnelDashboard businessId={businessId} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mt-6">Ads Campaign Planner / Paid Media Readiness / Budget Guard</h2>
          <PaidMediaDashboard businessId={businessId} />
        </div>
      </div>
    </FounderLayout>
  );
}