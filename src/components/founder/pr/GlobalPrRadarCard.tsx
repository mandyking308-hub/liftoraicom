import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Lock, Mail, Inbox, FileCheck2, Users, Mic, CalendarClock, Newspaper, ShieldAlert, Database, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const sb: any = supabase;

type PrSource = {
  id: string;
  source_name: string;
  source_type: string;
  cost_status: string | null;
  platform_status: string | null;
};

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  email_feed:           { label: "Email feed",        cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  email_feed_future:    { label: "Email feed (future)", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  platform_only:        { label: "Platform-only",     cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  parked:               { label: "Parked",            cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  paid_database_future: { label: "Paid (future)",     cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  public_web_future:    { label: "Public web (future)", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
};

function srcBadge(t: string) {
  const m = SOURCE_LABEL[t] ?? { label: t || "—", cls: "bg-secondary text-muted-foreground border-border/50" };
  return <Badge variant="outline" className={`${m.cls} text-[10px]`}>{m.label}</Badge>;
}

const DRAFT_PENDING_STATUSES = ["draft", "pending", "needs_review", "founder_review"];
const CAMPAIGN_OPEN_STATUSES = ["planned", "in_progress"];
const READINESS_BLOCKED_STATUSES = ["blocked", "partially_ready", "not_active"];
const OPP_CLOSED_STATUSES = ["closed", "rejected", "won", "lost", "expired"];

async function fetchPrRadar() {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
  const in30d = new Date(now.getTime() + 30 * 86400 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const countOpts = { count: "exact" as const, head: true };

  const [
    sourcesRes,
    inboundTodayRes,
    inboundUnprocessedRes,
    oppsTotalRes,
    oppsOpenRes,
    oppsUrgentRes,
    draftsPendingRes,
    journalistsRes,
    sectorLeadersRes,
    campaignsDueRes,
    coverageTotalRes,
    coverageMonthRes,
    readinessBlockedRes,
  ] = await Promise.all([
    sb.from("pr_sources").select("id,source_name,source_type,cost_status,platform_status").order("source_name", { ascending: true }),
    sb.from("pr_inbound_messages").select("*", countOpts).gte("received_at", startOfDay.toISOString()),
    sb.from("pr_inbound_messages").select("*", countOpts).eq("processed_status", "unprocessed"),
    sb.from("media_opportunities").select("*", countOpts),
    sb.from("media_opportunities").select("*", countOpts).not("status", "in", `(${OPP_CLOSED_STATUSES.join(",")})`),
    sb.from("media_opportunities").select("*", countOpts)
      .gte("deadline_at", now.toISOString())
      .lte("deadline_at", in24h.toISOString())
      .not("status", "in", `(${OPP_CLOSED_STATUSES.join(",")})`),
    sb.from("media_pitch_drafts").select("*", countOpts).in("approval_status", DRAFT_PENDING_STATUSES),
    sb.from("journalist_relationships").select("*", countOpts),
    sb.from("sector_leader_profiles").select("*", countOpts),
    sb.from("quarterly_pr_campaigns").select("*", countOpts).in("status", CAMPAIGN_OPEN_STATUSES).lte("due_date", in30d.toISOString().slice(0, 10)),
    sb.from("coverage_mentions").select("*", countOpts),
    sb.from("coverage_mentions").select("*", countOpts).gte("published_at", startOfMonth.toISOString()),
    sb.from("business_press_readiness").select("*", countOpts).in("press_ready_status", READINESS_BLOCKED_STATUSES),
  ]);

  const sources = (sourcesRes.data ?? []) as PrSource[];
  return {
    sources,
    inboundToday: inboundTodayRes.count ?? 0,
    inboundUnprocessed: inboundUnprocessedRes.count ?? 0,
    oppsTotal: oppsTotalRes.count ?? 0,
    oppsOpen: oppsOpenRes.count ?? 0,
    oppsUrgent: oppsUrgentRes.count ?? 0,
    draftsPending: draftsPendingRes.count ?? 0,
    journalists: journalistsRes.count ?? 0,
    sectorLeaders: sectorLeadersRes.count ?? 0,
    campaignsDue: campaignsDueRes.count ?? 0,
    coverageTotal: coverageTotalRes.count ?? 0,
    coverageMonth: coverageMonthRes.count ?? 0,
    readinessBlocked: readinessBlockedRes.count ?? 0,
  };
}

type Metric = { icon: React.ReactNode; label: string; value: number; hint?: string };

function MetricTile({ m }: { m: Metric }) {
  return (
    <div className="rounded-lg border border-border/40 bg-secondary/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{m.icon}<span>{m.label}</span></div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{m.value}</div>
      {m.hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{m.hint}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}

export default function GlobalPrRadarCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["global-pr-radar-card"],
    queryFn: fetchPrRadar,
    refetchInterval: 60000,
  });

  const sources = data?.sources ?? [];
  const totalSources = sources.length;
  const activeSources = sources.filter(s => s.platform_status === "active").length;
  const parkedSources = sources.filter(s => s.platform_status === "parked").length;
  const platformOnly = sources.filter(s => s.source_type === "platform_only").length;
  const futureSources = sources.filter(s => s.source_type?.endsWith("_future")).length;

  const noInbound = (data?.inboundToday ?? 0) === 0 && (data?.inboundUnprocessed ?? 0) === 0 && (data?.oppsTotal ?? 0) === 0;

  const metrics: Metric[] = [
    { icon: <Database className="h-3.5 w-3.5" />, label: "PR sources configured", value: totalSources, hint: `${activeSources} active · ${platformOnly} platform · ${futureSources} future · ${parkedSources} parked` },
    { icon: <Mail className="h-3.5 w-3.5" />, label: "PR emails today", value: data?.inboundToday ?? 0 },
    { icon: <Inbox className="h-3.5 w-3.5" />, label: "Unprocessed PR emails", value: data?.inboundUnprocessed ?? 0 },
    { icon: <Radio className="h-3.5 w-3.5" />, label: "Media opportunities", value: data?.oppsTotal ?? 0, hint: `${data?.oppsOpen ?? 0} open` },
    { icon: <CalendarClock className="h-3.5 w-3.5" />, label: "Urgent ≤24h", value: data?.oppsUrgent ?? 0 },
    { icon: <FileCheck2 className="h-3.5 w-3.5" />, label: "Drafts awaiting approval", value: data?.draftsPending ?? 0 },
    { icon: <Users className="h-3.5 w-3.5" />, label: "Journalists saved", value: data?.journalists ?? 0 },
    { icon: <Mic className="h-3.5 w-3.5" />, label: "Sector leaders / experts", value: data?.sectorLeaders ?? 0 },
    { icon: <CalendarClock className="h-3.5 w-3.5" />, label: "Quarterly PR due ≤30d", value: data?.campaignsDue ?? 0 },
    { icon: <Newspaper className="h-3.5 w-3.5" />, label: "Coverage mentions", value: data?.coverageTotal ?? 0, hint: `${data?.coverageMonth ?? 0} this month` },
    { icon: <ShieldAlert className="h-3.5 w-3.5" />, label: "Businesses blocked (press readiness)", value: data?.readinessBlocked ?? 0 },
  ];

  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-primary" />
              Global PR Radar
              <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]"><Lock className="h-3 w-3 mr-1" />Founder-only</Badge>
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Media opportunities, journalists, experts, quarterly PR and coverage control.
            </div>
          </div>
          <Link to="/founder/global-pr-radar">
            <Button size="sm" variant="outline">Open Global PR Radar<ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded p-2">
            Could not load PR Radar metrics: {(error as Error)?.message ?? "unknown error"}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading PR Radar…</div>
        ) : (
          <>
            <Section title="Inbox · opportunities · approvals · media atlas · quarterly · coverage · readiness">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {metrics.map(m => <MetricTile key={m.label} m={m} />)}
              </div>
            </Section>

            <Section title="Source setup">
              {sources.length === 0 ? (
                <div className="text-xs text-muted-foreground">No PR sources configured yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sources.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 rounded-md border border-border/40 bg-secondary/30 px-2 py-1">
                      <span className="text-xs">{s.source_name}</span>
                      {srcBadge(s.source_type)}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {noInbound ? (
              <div className="rounded-md border border-border/40 bg-secondary/20 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Setup mode</div>
                PR database foundation is ready. Gmail intake and parsers will be added in Phase 3/4. No opportunities have been ingested yet.
              </div>
            ) : null}

            <div className="text-[11px] text-muted-foreground">
              Founder-only · no external sending · no AI parsing yet · no Qwoted/LinkedIn scraping.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}