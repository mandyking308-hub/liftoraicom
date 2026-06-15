import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Radio, Lock, ArrowLeft, ShieldAlert, Mail, Inbox, FileCheck2, Users, Mic, CalendarClock, Newspaper, Database, Settings as SettingsIcon, Loader2, Download, Send, Copy, ExternalLink, Check, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb: any = supabase;
const ROW_LIMIT = 100;

const SOURCE_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  email_feed:           { label: "Email feed",           cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  email_feed_future:    { label: "Email feed (future)",  cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  platform_only:        { label: "Platform-only",        cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  parked:               { label: "Parked",               cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  paid_database_future: { label: "Paid (future)",        cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  public_web_future:    { label: "Public web (future)",  cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
};

function typeBadge(t?: string | null) {
  const m = SOURCE_TYPE_LABEL[t ?? ""] ?? { label: t || "—", cls: "bg-secondary text-muted-foreground border-border/50" };
  return <Badge variant="outline" className={`${m.cls} text-[10px]`}>{m.label}</Badge>;
}
function chip(text: string, cls = "bg-secondary text-muted-foreground border-border/50") {
  return <Badge variant="outline" className={`${cls} text-[10px]`}>{text}</Badge>;
}
const INBOUND_STATUS_CLS: Record<string, string> = {
  unprocessed: "bg-secondary text-muted-foreground border-border/50",
  parsed_editorielle: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  parsed_source_of_sources: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  parsed_haro: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  parsed_pressplugs: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  no_opportunities_found: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  parse_error: "bg-red-500/15 text-red-300 border-red-500/30",
  needs_source_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  needs_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};
function inboundStatusChip(s?: string | null) {
  if (!s) return chip("—");
  return chip(s, INBOUND_STATUS_CLS[s] ?? "bg-secondary text-muted-foreground border-border/50");
}
function fmtDate(d?: string | null) { return d ? new Date(d).toLocaleString() : "—"; }
function fmtDateShort(d?: string | null) { return d ? new Date(d).toLocaleDateString() : "—"; }
function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-border/40 bg-secondary/20 p-4 text-xs text-muted-foreground">{children}</div>;
}
function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-secondary/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
    </div>
  );
}

const DRAFT_PENDING_STATUSES = ["draft", "pending", "needs_review", "founder_review"];
const CAMPAIGN_OPEN_STATUSES = ["planned", "in_progress"];
const READINESS_BLOCKED_STATUSES = ["blocked", "partially_ready", "not_active"];
const OPP_CLOSED_STATUSES = ["closed", "rejected", "won", "lost", "expired"];

async function fetchOverview() {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
  const in30d = new Date(now.getTime() + 30 * 86400 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const countOpts = { count: "exact" as const, head: true };

  const [src, today, unproc, oppT, oppO, oppU, drafts, jour, sect, camps, covT, covM, blocked, ready, matchReady, matchAssets] = await Promise.all([
    sb.from("pr_sources").select("*", countOpts),
    sb.from("pr_inbound_messages").select("*", countOpts).gte("received_at", startOfDay.toISOString()),
    sb.from("pr_inbound_messages").select("*", countOpts).eq("processed_status", "unprocessed"),
    sb.from("media_opportunities").select("*", countOpts),
    sb.from("media_opportunities").select("*", countOpts).not("status", "in", `(${OPP_CLOSED_STATUSES.join(",")})`),
    sb.from("media_opportunities").select("*", countOpts).gte("deadline_at", now.toISOString()).lte("deadline_at", in24h.toISOString()).not("status", "in", `(${OPP_CLOSED_STATUSES.join(",")})`),
    sb.from("media_pitch_drafts").select("*", countOpts).in("approval_status", DRAFT_PENDING_STATUSES),
    sb.from("journalist_relationships").select("*", countOpts),
    sb.from("sector_leader_profiles").select("*", countOpts),
    sb.from("quarterly_pr_campaigns").select("*", countOpts).in("status", CAMPAIGN_OPEN_STATUSES).lte("due_date", in30d.toISOString().slice(0, 10)),
    sb.from("coverage_mentions").select("*", countOpts),
    sb.from("coverage_mentions").select("*", countOpts).gte("published_at", startOfMonth.toISOString()),
    sb.from("business_press_readiness").select("*", countOpts).in("press_ready_status", READINESS_BLOCKED_STATUSES),
    sb.from("business_press_readiness").select("*", countOpts).eq("press_ready_status", "ready").eq("is_active", true),
    sb.from("media_opportunity_matches").select("*", countOpts).eq("recommended_action", "draft_pitch"),
    sb.from("media_opportunity_matches").select("*", countOpts).eq("recommended_action", "request_assets"),
  ]);
  return {
    sources: src.count ?? 0,
    inboundToday: today.count ?? 0,
    inboundUnprocessed: unproc.count ?? 0,
    oppsTotal: oppT.count ?? 0,
    oppsOpen: oppO.count ?? 0,
    oppsUrgent: oppU.count ?? 0,
    draftsPending: drafts.count ?? 0,
    journalists: jour.count ?? 0,
    sectorLeaders: sect.count ?? 0,
    campaignsDue: camps.count ?? 0,
    coverageTotal: covT.count ?? 0,
    coverageMonth: covM.count ?? 0,
    readinessBlocked: blocked.count ?? 0,
    readinessReady: ready.count ?? 0,
    matchesReadyDraft: matchReady.count ?? 0,
    matchesAwaitingAssets: matchAssets.count ?? 0,
  };
}

function useTable<T = any>(key: string, query: () => Promise<T[]>) {
  return useQuery({ queryKey: [key], queryFn: query, staleTime: 30_000 });
}

// ----------------- Overview -----------------
function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ["pr-overview"], queryFn: fetchOverview, refetchInterval: 60_000 });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  const d = data!;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      <Metric icon={<Database className="h-3.5 w-3.5" />} label="Sources configured" value={d.sources} />
      <Metric icon={<Mail className="h-3.5 w-3.5" />} label="PR emails today" value={d.inboundToday} />
      <Metric icon={<Inbox className="h-3.5 w-3.5" />} label="Unprocessed inbound" value={d.inboundUnprocessed} />
      <Metric icon={<Radio className="h-3.5 w-3.5" />} label="Opportunities total" value={d.oppsTotal} hint={`${d.oppsOpen} open`} />
      <Metric icon={<CalendarClock className="h-3.5 w-3.5" />} label="Urgent ≤24h" value={d.oppsUrgent} />
      <Metric icon={<FileCheck2 className="h-3.5 w-3.5" />} label="Drafts awaiting approval" value={d.draftsPending} />
      <Metric icon={<Users className="h-3.5 w-3.5" />} label="Journalists saved" value={d.journalists} />
      <Metric icon={<Mic className="h-3.5 w-3.5" />} label="Sector leaders / experts" value={d.sectorLeaders} />
      <Metric icon={<CalendarClock className="h-3.5 w-3.5" />} label="Quarterly PR due ≤30d" value={d.campaignsDue} />
      <Metric icon={<Newspaper className="h-3.5 w-3.5" />} label="Coverage mentions" value={d.coverageTotal} hint={`${d.coverageMonth} this month`} />
      <Metric icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Press-readiness blockers" value={d.readinessBlocked} />
      <Metric icon={<FileCheck2 className="h-3.5 w-3.5" />} label="Businesses press-ready" value={d.readinessReady} />
      <Metric icon={<FileCheck2 className="h-3.5 w-3.5" />} label="Matches ready for draft" value={d.matchesReadyDraft} hint={`${d.matchesAwaitingAssets} need assets`} />
    </div>
  );
}

// ----------------- Sources -----------------
function SourcesTab() {
  const { data: rows = [], isLoading } = useTable("pr-sources-list", async () => {
    const { data } = await sb.from("pr_sources").select("*").order("source_name", { ascending: true });
    return data ?? [];
  });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <EmptyState>No PR sources configured.</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>Platform</TableHead>
          <TableHead>Cost</TableHead><TableHead>Trial</TableHead><TableHead>Email</TableHead>
          <TableHead>Website</TableHead><TableHead>Notes</TableHead><TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.source_name}</TableCell>
            <TableCell>{typeBadge(r.source_type)}</TableCell>
            <TableCell className="text-xs">{r.platform_status || "—"}</TableCell>
            <TableCell className="text-xs">{r.cost_status || "—"}</TableCell>
            <TableCell className="text-xs">{r.trial_status || "—"}</TableCell>
            <TableCell className="text-xs">{r.account_email || "—"}</TableCell>
            <TableCell className="text-xs">{r.website_url || "—"}</TableCell>
            <TableCell className="text-xs max-w-[240px] truncate" title={r.notes || ""}>{r.notes || "—"}</TableCell>
            <TableCell className="text-xs">{fmtDateShort(r.updated_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ----------------- Inbound -----------------
function InboundTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useTable("pr-inbound-list", async () => {
    const { data } = await sb.from("pr_inbound_messages")
      .select("id,received_at,source_id,sender_email,sender_name,subject,processed_status,is_likely_opportunity,ai_processed,duplicate_of,created_at")
      .order("received_at", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  return (
    <div className="space-y-3">
      <GmailIntakePanel onDone={() => {
        qc.invalidateQueries({ queryKey: ["pr-inbound-list"] });
        qc.invalidateQueries({ queryKey: ["pr-overview"] });
      }} />
      <EditorielleParserPanel onDone={() => {
        qc.invalidateQueries({ queryKey: ["pr-inbound-list"] });
        qc.invalidateQueries({ queryKey: ["pr-opps-list"] });
        qc.invalidateQueries({ queryKey: ["pr-overview"] });
      }} />
      <DigestParserPanel onDone={() => {
        qc.invalidateQueries({ queryKey: ["pr-inbound-list"] });
        qc.invalidateQueries({ queryKey: ["pr-opps-list"] });
        qc.invalidateQueries({ queryKey: ["pr-overview"] });
      }} />
      {isLoading ? <div className="text-xs text-muted-foreground">Loading…</div> :
       rows.length === 0 ? <EmptyState>No PR emails have been ingested yet. Run a Gmail PR intake above to capture messages from the “Liftor/PR Opportunities” label and known PR-source senders.</EmptyState> :
    <Table>
      <TableHeader><TableRow>
        <TableHead>Received</TableHead><TableHead>Source</TableHead><TableHead>Sender</TableHead>
        <TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Likely opp</TableHead>
        <TableHead>AI</TableHead><TableHead>Duplicate of</TableHead><TableHead>Created</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{fmtDate(r.received_at)}</TableCell>
            <TableCell className="text-xs">{r.source_id ? r.source_id.slice(0, 8) : "—"}</TableCell>
            <TableCell className="text-xs">{r.sender_name || r.sender_email || "—"}</TableCell>
            <TableCell className="text-xs max-w-[320px] truncate" title={r.subject || ""}>{r.subject || "—"}</TableCell>
            <TableCell>{inboundStatusChip(r.processed_status)}</TableCell>
            <TableCell className="text-xs">{r.is_likely_opportunity ? "Yes" : "—"}</TableCell>
            <TableCell className="text-xs">{r.ai_processed ? "Yes" : "—"}</TableCell>
            <TableCell className="text-xs">{r.duplicate_of ? r.duplicate_of.slice(0, 8) : "—"}</TableCell>
            <TableCell className="text-xs">{fmtDateShort(r.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>}
    </div>
  );
}

// ----------------- Gmail Intake Control -----------------
function GmailIntakePanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [lookback, setLookback] = useState(7);
  const [result, setResult] = useState<any | null>(null);

  const run = async (dryRun: boolean) => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await sb.functions.invoke("pr-opportunity-email-ingest", {
        body: { mode: "manual", lookback_days: lookback, dry_run: dryRun },
      });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        if (dryRun) toast.success(`Dry run: would insert ${data.inserted} of ${data.emails_seen} emails.`);
        else toast.success(`Ingested ${data.inserted} new PR email(s).`);
        onDone?.();
      } else if (data?.reason === "gmail_not_configured") {
        toast.error("Gmail not configured — see panel for missing secrets.");
      } else {
        toast.error(data?.message || data?.reason || "Intake failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Intake failed");
      setResult({ ok: false, reason: "invoke_error", message: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Gmail PR intake</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Liftor reads only the <span className="font-mono">Liftor/PR Opportunities</span> Gmail label and known PR-source senders.
          It does not scan the whole inbox, does not extract opportunities, does not call AI, and does not send any reply.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Lookback (days)
            <input
              type="number" min={1} max={30} value={lookback}
              onChange={(e) => setLookback(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
              className="w-16 rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs"
              disabled={running}
            />
          </label>
          <Button size="sm" variant="outline" disabled={running} onClick={() => run(true)}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Dry run
          </Button>
          <Button size="sm" disabled={running} onClick={() => run(false)}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Run Gmail PR intake
          </Button>
        </div>
        {result ? (
          <div className={`rounded-md border p-2 text-[11px] ${result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"}`}>
            {result.ok ? (
              <div className="space-y-0.5">
                <div><b>Seen</b> {result.emails_seen} · <b>Inserted</b> {result.inserted} · <b>Duplicates</b> {result.skipped_duplicates} · <b>Unknown source</b> {result.skipped_unknown_source} · <b>Out of scope</b> {result.skipped_out_of_scope}</div>
                <div>Labels resolved: {(result.labels_resolved ?? []).join(", ") || "—"}</div>
                <div>Sources seen: {(result.sources_seen ?? []).join(", ") || "—"}</div>
                {result.dry_run ? <div className="italic">Dry run — nothing was written.</div> : null}
              </div>
            ) : result.reason === "gmail_not_configured" ? (
              <div className="space-y-1">
                <div className="font-medium">Gmail is not configured.</div>
                <div>Missing secrets: <span className="font-mono">{(result.missing ?? []).join(", ")}</span></div>
                <div className="text-muted-foreground">Add these via Lovable Cloud secrets, then retry. No fake records were created.</div>
              </div>
            ) : (
              <div><b>{result.reason || "error"}:</b> {result.message || "Unknown error"}</div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ----------------- Opportunities -----------------
// ----------------- Editorielle parser control -----------------
function EditorielleParserPanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(10);
  const [dryRun, setDryRun] = useState(false);
  const [forceReparse, setForceReparse] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await sb.functions.invoke("pr-parse-editorielle", {
        body: { limit, dry_run: dryRun, force_reparse: forceReparse },
      });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        toast.success(dryRun
          ? `Dry run: ${data.opportunities_inserted} opportunities would be created.`
          : `Parsed ${data.messages_parsed} email(s) → ${data.opportunities_inserted} opportunities.`);
        onDone?.();
      } else {
        toast.error(data?.message || data?.reason || "Parser failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Parser failed");
      setResult({ ok: false, reason: "invoke_error", message: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4 text-primary" />Editorielle parser</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Rules-based parser. Splits captured Editorielle daily emails into individual media opportunities.
          No AI, no sending, no drafting. Already-parsed emails are skipped unless <span className="font-mono">force reparse</span> is on.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Limit
            <input
              type="number" min={1} max={50} value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
              className="w-16 rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs"
              disabled={running}
            />
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={running} />
            Dry run
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <input type="checkbox" checked={forceReparse} onChange={(e) => setForceReparse(e.target.checked)} disabled={running} />
            Force reparse
          </label>
          <Button size="sm" disabled={running} onClick={run}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />} Parse Editorielle emails
          </Button>
        </div>
        {result ? (
          <div className={`rounded-md border p-2 text-[11px] ${result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"}`}>
            {result.ok ? (
              <div className="space-y-0.5">
                <div><b>Seen</b> {result.messages_seen} · <b>Parsed</b> {result.messages_parsed} · <b>Inserted</b> {result.opportunities_inserted} · <b>Dup</b> {result.skipped_duplicates} · <b>Needs review</b> {result.needs_review} · <b>Errors</b> {result.parse_errors}</div>
                {result.dry_run ? <div className="italic">Dry run — nothing was written.</div> : null}
              </div>
            ) : (
              <div><b>{result.reason || "error"}:</b> {result.message || "Unknown error"}</div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ----------------- Combined digest parser control (SoS / HARO / PressPlugs) -----------------
const DIGEST_SOURCES = ["All digest sources", "Source of Sources", "HARO", "PressPlugs"] as const;
function DigestParserPanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(10);
  const [dryRun, setDryRun] = useState(false);
  const [forceReparse, setForceReparse] = useState(false);
  const [sourceChoice, setSourceChoice] = useState<typeof DIGEST_SOURCES[number]>("All digest sources");
  const [result, setResult] = useState<any | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const payload: any = { limit, dry_run: dryRun, force_reparse: forceReparse };
      if (sourceChoice !== "All digest sources") payload.source_name = sourceChoice;
      const { data, error } = await sb.functions.invoke("pr-parse-email-digests", { body: payload });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        toast.success(dryRun
          ? `Dry run: ${data.opportunities_inserted} opportunities would be created.`
          : `Parsed ${data.messages_parsed} email(s) → ${data.opportunities_inserted} opportunities.`);
        onDone?.();
      } else {
        toast.error(data?.message || data?.reason || "Parser failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Parser failed");
      setResult({ ok: false, reason: "invoke_error", message: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4 text-primary" />Parse PR digest emails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Rules-based parser for Source of Sources, HARO and PressPlugs digests. Splits captured emails into individual media opportunities.
          No AI, no sending, no drafting. Already-parsed messages are skipped unless <span className="font-mono">force reparse</span> is on.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Source
            <select
              value={sourceChoice}
              onChange={(e) => setSourceChoice(e.target.value as any)}
              disabled={running}
              className="rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs"
            >
              {DIGEST_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Limit
            <input
              type="number" min={1} max={50} value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
              className="w-16 rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs"
              disabled={running}
            />
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={running} /> Dry run
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <input type="checkbox" checked={forceReparse} onChange={(e) => setForceReparse(e.target.checked)} disabled={running} /> Force reparse
          </label>
          <Button size="sm" disabled={running} onClick={run}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />} Parse digest emails
          </Button>
        </div>
        {result ? (
          <div className={`rounded-md border p-2 text-[11px] ${result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"}`}>
            {result.ok ? (
              <div className="space-y-0.5">
                <div><b>Sources</b> {(result.source_names ?? []).join(", ") || "—"}</div>
                <div><b>Seen</b> {result.messages_seen} · <b>Parsed</b> {result.messages_parsed} · <b>Inserted</b> {result.opportunities_inserted} · <b>Dup</b> {result.skipped_duplicates} · <b>Needs review</b> {result.needs_review} · <b>Errors</b> {result.parse_errors}</div>
                {result.dry_run ? <div className="italic">Dry run — nothing was written.</div> : null}
              </div>
            ) : (
              <div><b>{result.reason || "error"}:</b> {result.message || "Unknown error"}</div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ----------------- Opportunities -----------------
function OpportunitiesTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useTable("pr-opps-list", async () => {
    const { data } = await sb.from("media_opportunities")
      .select("id,deadline_at,title,category,publication_name,journalist_name,source_id,contact_route,urgency_score,risk_score,status,created_at")
      .order("deadline_at", { ascending: true, nullsFirst: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  const { data: matches = [] } = useTable("pr-opp-matches", async () => {
    const { data } = await sb.from("media_opportunity_matches")
      .select("id,opportunity_id,business_id,match_score,recommended_action,active_business_gate_status,press_readiness_status,missing_assets,risk_notes,created_at")
      .order("match_score", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  const { data: readiness = [] } = useTable("pr-readiness-lite", async () => {
    const { data } = await sb.from("business_press_readiness").select("business_id,business_name");
    return data ?? [];
  });
  const bizName = useMemo(() => {
    const m = new Map<string, string>();
    (readiness as any[]).forEach((r) => m.set(r.business_id, r.business_name || r.business_id.slice(0, 8)));
    return m;
  }, [readiness]);
  const bestByOpp = useMemo(() => {
    const m = new Map<string, any>();
    (matches as any[]).forEach((mt) => {
      const cur = m.get(mt.opportunity_id);
      if (!cur || (mt.match_score ?? -999) > (cur.match_score ?? -999)) m.set(mt.opportunity_id, mt);
    });
    return m;
  }, [matches]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pr-opps-list"] });
    qc.invalidateQueries({ queryKey: ["pr-opp-matches"] });
    qc.invalidateQueries({ queryKey: ["pr-overview"] });
  };

  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-4">
      <MatchPanel onDone={refresh} />
      {rows.length === 0 ? (
        <EmptyState>No media opportunities have been extracted yet. Run a parser from the Inbound Messages tab.</EmptyState>
      ) : (
      <Table>
      <TableHeader><TableRow>
        <TableHead>Deadline</TableHead><TableHead>Title</TableHead><TableHead>Category</TableHead>
        <TableHead>Publication</TableHead><TableHead>Journalist</TableHead><TableHead>Source</TableHead>
        <TableHead>Route</TableHead><TableHead>Urgency</TableHead><TableHead>Risk</TableHead><TableHead>Status</TableHead>
        <TableHead>Best match</TableHead><TableHead>Score</TableHead><TableHead>Action</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r: any) => {
          const m = bestByOpp.get(r.id);
          return (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{fmtDate(r.deadline_at)}</TableCell>
            <TableCell className="text-xs max-w-[260px] truncate">{r.title || "—"}</TableCell>
            <TableCell className="text-xs">{r.category || "—"}</TableCell>
            <TableCell className="text-xs">{r.publication_name || "—"}</TableCell>
            <TableCell className="text-xs">{r.journalist_name || "—"}</TableCell>
            <TableCell className="text-xs">{r.source_id ? r.source_id.slice(0, 8) : "—"}</TableCell>
            <TableCell className="text-xs">{r.contact_route || "—"}</TableCell>
            <TableCell className="text-xs tabular-nums">{r.urgency_score ?? 0}</TableCell>
            <TableCell className="text-xs tabular-nums">{r.risk_score ?? 0}</TableCell>
            <TableCell>{chip(r.status || "—")}</TableCell>
            <TableCell className="text-xs">{m ? (bizName.get(m.business_id) || m.business_id?.slice(0, 8)) : "—"}</TableCell>
            <TableCell className="text-xs tabular-nums">{m ? m.match_score : "—"}</TableCell>
            <TableCell>{m ? actionChip(m.recommended_action) : chip("—")}</TableCell>
          </TableRow>);
        })}
      </TableBody>
      </Table>
      )}
      <OpportunityMatchesSection matches={matches as any[]} bizName={bizName} />
    </div>
  );
}

// ----------------- Opportunity Matches -----------------
function actionChip(a?: string | null) {
  const map: Record<string, string> = {
    draft_pitch: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    request_assets: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    prepare_only: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    park: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    reject: "bg-secondary text-muted-foreground border-border/50",
    block: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return chip(a || "—", map[a ?? ""] ?? "bg-secondary text-muted-foreground border-border/50");
}

function MatchPanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(50);
  const [dryRun, setDryRun] = useState(true);
  const [forceRematch, setForceRematch] = useState(false);
  const [opportunityId, setOpportunityId] = useState("");
  const [result, setResult] = useState<any | null>(null);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const payload: any = { limit, dry_run: dryRun, force_rematch: forceRematch };
      if (opportunityId.trim()) payload.opportunity_id = opportunityId.trim();
      const { data, error } = await sb.functions.invoke("pr-business-match", { body: payload });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        if (data.reason === "no_active_businesses") {
          toast.error("No active businesses. Mark a press-readiness record as active first.");
        } else {
          toast.success(dryRun
            ? `Dry run: ${data.opportunities_seen} opp × ${data.businesses_seen} biz.`
            : `Matched: +${data.matches_inserted} / ~${data.matches_updated}`);
          if (!dryRun) onDone?.();
        }
      } else toast.error(data?.message || data?.reason || "Match failed");
    } catch (e: any) {
      toast.error(e?.message || "Match failed");
    } finally { setRunning(false); }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" />Match opportunities to active businesses</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Rules-based scoring only. Opportunities are only marked <i>draft_pitch</i> when the business is active, press-ready,
          has a live website/offer, has compliance clearance and no blocked-topic conflict. No AI, no sending, no drafting.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1 text-muted-foreground">Limit
            <input type="number" min={1} max={200} value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 50)))}
              className="w-20 rounded border border-border/40 bg-secondary/40 px-2 py-1" disabled={running} />
          </label>
          <label className="flex items-center gap-1 text-muted-foreground">Opportunity id
            <input value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} placeholder="optional uuid"
              className="w-64 rounded border border-border/40 bg-secondary/40 px-2 py-1 font-mono" disabled={running} />
          </label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={running} /> Dry run</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={forceRematch} onChange={(e) => setForceRematch(e.target.checked)} disabled={running} /> Force rematch</label>
          <Button size="sm" disabled={running} onClick={run}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck2 className="h-3 w-3" />} Run matching
          </Button>
        </div>
        {result?.ok ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 p-2 text-[11px]">
            {result.reason === "no_active_businesses"
              ? <span>No active businesses found. Activate at least one press-readiness record.</span>
              : (<><b>Opps</b> {result.opportunities_seen} · <b>Biz</b> {result.businesses_seen} · <b>+</b>{result.matches_inserted} <b>~</b>{result.matches_updated} <b>=</b>{result.matches_skipped} · draft {result.draft_pitch} · assets {result.request_assets} · prep {result.prepare_only} · park {result.park} · reject {result.reject} · block {result.block} {result.dry_run ? <i>· dry run</i> : null}</>)}
          </div>
        ) : result ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 p-2 text-[11px]">{result.reason || "error"}: {result.message}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OpportunityMatchesSection({ matches, bizName }: { matches: any[]; bizName: Map<string, string> }) {
  const { data: oppMap = new Map() } = useQuery({
    queryKey: ["pr-opp-titles", matches.length],
    queryFn: async () => {
      const ids = Array.from(new Set(matches.map((m) => m.opportunity_id))).filter(Boolean);
      if (!ids.length) return new Map<string, string>();
      const { data } = await sb.from("media_opportunities").select("id,title").in("id", ids);
      const m = new Map<string, string>();
      (data ?? []).forEach((r: any) => m.set(r.id, r.title || r.id.slice(0, 8)));
      return m;
    },
    staleTime: 30_000,
  });
  if (!matches.length) return null;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Opportunity matches</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Opportunity</TableHead><TableHead>Business</TableHead><TableHead>Score</TableHead>
            <TableHead>Action</TableHead><TableHead>Active</TableHead><TableHead>Readiness</TableHead>
            <TableHead>Missing</TableHead><TableHead>Risk</TableHead><TableHead>When</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {matches.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs max-w-[260px] truncate">{(oppMap as Map<string, string>).get(m.opportunity_id) || m.opportunity_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-xs">{bizName.get(m.business_id) || m.business_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-xs tabular-nums">{m.match_score ?? 0}</TableCell>
                <TableCell>{actionChip(m.recommended_action)}</TableCell>
                <TableCell>{chip(m.active_business_gate_status || "—")}</TableCell>
                <TableCell>{chip(m.press_readiness_status || "—")}</TableCell>
                <TableCell className="text-xs">{(m.missing_assets ?? []).length}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{m.risk_notes || "—"}</TableCell>
                <TableCell className="text-xs">{fmtDateShort(m.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ----------------- Media Atlas -----------------
function MediaAtlasTab() {
  const qc = useQueryClient();
  const { data: journalists = [] } = useTable("pr-journalists", async () => {
    const { data } = await sb.from("journalist_relationships")
      .select("id,name,publication_name,outlet_id,email,platform_name,country,beat,topics,contact_route,relationship_status,priority_score,do_not_contact,last_verified_at")
      .order("priority_score", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  const { data: leaders = [] } = useTable("pr-sector-leaders", async () => {
    const { data } = await sb.from("sector_leader_profiles")
      .select("id,name,title,company,country,source_platform,topics,hashtags,potential_use_case,contact_route,permission_status,priority_score,relationship_status")
      .order("priority_score", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });

  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [permissionFilter, setPermissionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [hideDnc, setHideDnc] = useState(false);

  const s = search.trim().toLowerCase();
  const matchText = (...parts: any[]) => !s || parts.some((p) => p && String(p).toLowerCase().includes(s));
  const filteredJournalists = (journalists as any[]).filter((r) => {
    if (hideDnc && r.do_not_contact) return false;
    if (routeFilter !== "all" && (r.contact_route || "unknown") !== routeFilter) return false;
    if (statusFilter !== "all" && (r.relationship_status || "new") !== statusFilter) return false;
    return matchText(r.name, r.publication_name, r.email, r.beat, r.country, ...(r.topics ?? []));
  });
  const filteredLeaders = (leaders as any[]).filter((r) => {
    if (sourceFilter !== "all" && (r.source_platform || "") !== sourceFilter) return false;
    if (routeFilter !== "all" && (r.contact_route || "unknown") !== routeFilter) return false;
    if (statusFilter !== "all" && (r.relationship_status || "new") !== statusFilter) return false;
    if (permissionFilter !== "all" && (r.permission_status || "not_requested") !== permissionFilter) return false;
    return matchText(r.name, r.title, r.company, r.country, ...(r.topics ?? []), ...(r.hashtags ?? []));
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pr-journalists"] });
    qc.invalidateQueries({ queryKey: ["pr-sector-leaders"] });
    qc.invalidateQueries({ queryKey: ["pr-overview"] });
  };

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-muted-foreground">
        Qwoted records are platform-only unless a separate lawful contact route is recorded.
      </div>
      <AtlasEnrichPanel onDone={refresh} />
      <ManualImportPanel onDone={refresh} />
      <div className="rounded-md border border-border/40 bg-secondary/20 p-2 flex flex-wrap gap-2 items-center text-xs">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / publication / topic…"
          className="flex-1 min-w-[200px] rounded border border-border/40 bg-secondary/40 px-2 py-1" />
        <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
          <option value="all">Any route</option><option value="email">email</option><option value="platform_only">platform_only</option><option value="unknown">unknown</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
          <option value="all">Any status</option><option value="new">new</option><option value="warm">warm</option><option value="active">active</option><option value="dormant">dormant</option>
        </select>
        <select value={permissionFilter} onChange={(e) => setPermissionFilter(e.target.value)} className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
          <option value="all">Any permission</option><option value="not_requested">not_requested</option><option value="requested">requested</option><option value="granted">granted</option><option value="denied">denied</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
          <option value="all">Any source</option><option value="Qwoted">Qwoted</option><option value="Manual">Manual</option><option value="Public Web">Public Web</option><option value="Event">Event</option><option value="Press List">Press List</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={hideDnc} onChange={(e) => setHideDnc(e.target.checked)} /> Hide DNC</label>
      </div>
      <Tabs defaultValue="journalists">
        <TabsList>
          <TabsTrigger value="journalists">Journalists / Media Contacts ({filteredJournalists.length})</TabsTrigger>
          <TabsTrigger value="leaders">Sector Leaders / Experts ({filteredLeaders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="journalists" className="mt-3">
          {filteredJournalists.length === 0 ? <EmptyState>No journalist relationships match the current filters.</EmptyState> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Publication</TableHead><TableHead>Email / Platform</TableHead>
                <TableHead>Country</TableHead><TableHead>Beat / Topics</TableHead><TableHead>Route</TableHead>
                <TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>DNC</TableHead><TableHead>Verified</TableHead><TableHead>Edit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredJournalists.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.name || "—"}</TableCell>
                    <TableCell className="text-xs">{r.publication_name || "—"}</TableCell>
                    <TableCell className="text-xs">{r.email || r.platform_name || "—"}</TableCell>
                    <TableCell className="text-xs">{r.country || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate">{r.beat || ""}{r.topics?.length ? ` · ${(r.topics as any[]).join(", ")}` : ""}</TableCell>
                    <TableCell className="text-xs">{r.contact_route || "unknown"}</TableCell>
                    <TableCell>{chip(r.relationship_status || "new")}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.priority_score ?? 0}</TableCell>
                    <TableCell className="text-xs">{r.do_not_contact ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-xs">{fmtDateShort(r.last_verified_at)}</TableCell>
                    <TableCell><AtlasEditButton table="journalist_relationships" row={r} onDone={refresh} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="leaders" className="mt-3">
          {filteredLeaders.length === 0 ? <EmptyState>No sector leaders / expert targets match the current filters.</EmptyState> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Title</TableHead><TableHead>Company</TableHead>
                <TableHead>Country</TableHead><TableHead>Source</TableHead><TableHead>Topics / Hashtags</TableHead>
                <TableHead>Use case</TableHead><TableHead>Route</TableHead><TableHead>Permission</TableHead>
                <TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Edit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredLeaders.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.name || "—"}</TableCell>
                    <TableCell className="text-xs">{r.title || "—"}</TableCell>
                    <TableCell className="text-xs">{r.company || "—"}</TableCell>
                    <TableCell className="text-xs">{r.country || "—"}</TableCell>
                    <TableCell className="text-xs">{r.source_platform || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[240px] truncate">{[...(r.topics ?? []), ...(r.hashtags ?? [])].join(", ") || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.potential_use_case || "—"}</TableCell>
                    <TableCell className="text-xs">{r.contact_route || "unknown"}</TableCell>
                    <TableCell>{chip(r.permission_status || "not_requested")}</TableCell>
                    <TableCell>{chip(r.relationship_status || "new")}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.priority_score ?? 0}</TableCell>
                    <TableCell><AtlasEditButton table="sector_leader_profiles" row={r} onDone={refresh} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------- Atlas: enrich-from-opportunities panel -----------------
function AtlasEnrichPanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(50);
  const [dryRun, setDryRun] = useState(true);
  const [sourceName, setSourceName] = useState("");
  const [result, setResult] = useState<any | null>(null);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const payload: any = { limit, dry_run: dryRun };
      if (sourceName.trim()) payload.source_name = sourceName.trim();
      const { data, error } = await sb.functions.invoke("pr-media-atlas-enrich", { body: payload });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        toast.success(dryRun
          ? `Dry run: ${data.opportunities_seen} opps; ${data.journalists_inserted}+${data.outlets_inserted} would insert.`
          : `Enriched ${data.opportunities_seen} opps → journalists +${data.journalists_inserted}, outlets +${data.outlets_inserted}.`);
        if (!dryRun) onDone?.();
      } else toast.error(data?.message || data?.reason || "Enrichment failed");
    } catch (e: any) {
      toast.error(e?.message || "Enrichment failed");
      setResult({ ok: false, message: String(e?.message || e) });
    } finally { setRunning(false); }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Build Media Atlas from opportunities</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Reads parsed opportunities and creates/updates outlets and journalists. No AI, no sending, no scraping.
          Dedupes by email, then name + publication for journalists; by normalised name for outlets.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground flex items-center gap-1">Limit
            <input type="number" min={1} max={200} value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 50)))}
              className="w-20 rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs" disabled={running} />
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">Source
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="optional (e.g. Editorielle)"
              className="w-44 rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs" disabled={running} />
          </label>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={running} /> Dry run
          </label>
          <Button size="sm" disabled={running} onClick={run}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />} Build Media Atlas
          </Button>
        </div>
        {result?.ok ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 p-2 text-[11px]">
            <b>Seen</b> {result.opportunities_seen} · <b>Outlets</b> +{result.outlets_inserted}/~{result.outlets_updated} · <b>Journalists</b> +{result.journalists_inserted}/~{result.journalists_updated} · <b>Dup</b> {result.duplicates} · <b>Skipped</b> {result.skipped_low_confidence} {result.dry_run ? <span className="italic">· dry run</span> : null}
          </div>
        ) : result ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 p-2 text-[11px]">{result.reason || "error"}: {result.message}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ----------------- Manual / Qwoted import panel -----------------
const IMPORT_SOURCES = ["Qwoted", "Manual", "Public Web", "Event", "Press List"] as const;
const IMPORT_TYPES = ["auto_classify", "journalists", "sector_leaders", "outlets", "mixed"] as const;
function ManualImportPanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState<typeof IMPORT_SOURCES[number]>("Qwoted");
  const [importType, setImportType] = useState<typeof IMPORT_TYPES[number]>("auto_classify");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<any | null>(null);

  const run = async (dryRun: boolean) => {
    if (!text.trim()) { toast.error("Paste some text first."); return; }
    setRunning(true);
    try {
      const { data, error } = await sb.functions.invoke("pr-media-atlas-manual-import", {
        body: { source_platform: sourcePlatform, import_type: importType, raw_text: text, dry_run: dryRun },
      });
      if (error) throw error;
      setPreview(data);
      if (data?.ok) {
        toast.success(dryRun
          ? `Preview: ${data.parsed} parsed; would insert ${data.sector_leaders_inserted + data.journalists_inserted + data.outlets_inserted}.`
          : `Imported: leaders +${data.sector_leaders_inserted}, journalists +${data.journalists_inserted}, outlets +${data.outlets_inserted}.`);
        if (!dryRun) { onDone?.(); setText(""); }
      } else toast.error(data?.message || data?.reason || "Import failed");
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally { setRunning(false); }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4 text-primary" />Manual / Qwoted import</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Paste visible/manual text or CSV you have lawfully obtained. Liftor will not fetch URLs, scrape Qwoted/LinkedIn, contact anyone or send anything.
          {sourcePlatform === "Qwoted" ? " Qwoted is platform-only — contact must happen inside Qwoted unless a separate lawful contact route is recorded." : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-muted-foreground">Source
            <select value={sourcePlatform} onChange={(e) => setSourcePlatform(e.target.value as any)} disabled={running}
              className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
              {IMPORT_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1 text-muted-foreground">Type
            <select value={importType} onChange={(e) => setImportType(e.target.value as any)} disabled={running}
              className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
              {IMPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} disabled={running}
          placeholder={"CSV: name,title,company,country,topics,profile_url,email\n\nOr blocks:\nName: Jane Doe\nTitle: Head of AI\nCompany: Acme\nCountry: UK\nTopics: AI, leadership\nProfile URL: https://qwoted.com/..."}
          className="w-full rounded border border-border/40 bg-secondary/40 px-2 py-1 text-xs font-mono" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={running} onClick={() => run(true)}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Preview import
          </Button>
          <Button size="sm" disabled={running || !preview?.ok} onClick={() => run(false)}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Import records
          </Button>
        </div>
        {preview?.ok ? (
          <div className="rounded-md border border-border/40 bg-secondary/20 p-2 text-[11px] space-y-2">
            <div><b>Parsed</b> {preview.parsed} · <b>Leaders</b> +{preview.sector_leaders_inserted} · <b>Journalists</b> +{preview.journalists_inserted} · <b>Outlets</b> +{preview.outlets_inserted} · <b>Dup</b> {preview.duplicates} · <b>Skipped</b> {preview.skipped_low_confidence} {preview.dry_run ? <span className="italic">· dry run</span> : null}</div>
            {Array.isArray(preview.preview) && preview.preview.length ? (
              <div className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Class</TableHead><TableHead>Action</TableHead><TableHead>Company / Pub</TableHead><TableHead>Country</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {preview.preview.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{p.row?.name || "—"}</TableCell>
                        <TableCell className="text-xs">{chip(p.classification)}</TableCell>
                        <TableCell className="text-xs">{chip(p.action)}</TableCell>
                        <TableCell className="text-xs">{p.row?.company || p.row?.publication || "—"}</TableCell>
                        <TableCell className="text-xs">{p.row?.country || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ----------------- Atlas edit drawer (safe fields) -----------------
function AtlasEditButton({ table, row, onDone }: { table: "journalist_relationships" | "sector_leader_profiles"; row: any; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [relStatus, setRelStatus] = useState<string>(row.relationship_status || "new");
  const [priority, setPriority] = useState<number>(row.priority_score ?? 0);
  const [useCase, setUseCase] = useState<string>(row.potential_use_case || "");
  const [permission, setPermission] = useState<string>(row.permission_status || "not_requested");
  const [caution, setCaution] = useState<string>(row.caution_notes || "");
  const [dnc, setDnc] = useState<boolean>(!!row.do_not_contact);

  const save = async () => {
    setSaving(true);
    const patch: Record<string, any> = {
      relationship_status: relStatus,
      priority_score: Math.max(0, Math.min(100, Number(priority) || 0)),
      caution_notes: caution || null,
    };
    if (table === "journalist_relationships") patch.do_not_contact = dnc;
    if (table === "sector_leader_profiles") {
      patch.potential_use_case = useCase || null;
      patch.permission_status = permission;
    }
    const { error } = await sb.from(table).update(patch).eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setOpen(false); onDone?.(); }
  };

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</Button>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setOpen(false)}>
      <Card className="tech-card max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Edit {row.name || "record"}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <label className="block">Relationship status
            <select value={relStatus} onChange={(e) => setRelStatus(e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1">
              {["new","warm","active","dormant","blocked"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="block">Priority score (0–100)
            <input type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          {table === "sector_leader_profiles" ? (
            <>
              <label className="block">Potential use case
                <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1">
                  {["","expert_quote","patron_target","philanthropist_target","supporter_target","partner_target","sector_validation","market_signal","podcast_guest","advisory_contact","future_pr_relationship"].map((v) => <option key={v} value={v}>{v || "—"}</option>)}
                </select>
              </label>
              <label className="block">Permission status
                <select value={permission} onChange={(e) => setPermission(e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1">
                  {["not_requested","requested","granted","denied"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label className="flex items-center gap-2"><input type="checkbox" checked={dnc} onChange={(e) => setDnc(e.target.checked)} /> Do not contact</label>
          )}
          <label className="block">Caution notes
            <textarea value={caution} onChange={(e) => setCaution(e.target.value)} rows={2}
              className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={save}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------- Press Readiness -----------------
function ReadinessTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useTable("pr-readiness", async () => {
    const { data } = await sb.from("business_press_readiness")
      .select("*")
      .order("updated_at", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  const { data: packs = [] } = useTable("pr-packs", async () => {
    const { data } = await sb.from("business_press_packs")
      .select("id,business_id,pack_name,one_line_description,approved_quote_bank,image_asset_links,logo_asset_links,approved_claims,blocked_claims")
      .order("updated_at", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  const [activeOnly, setActiveOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [missingOnly, setMissingOnly] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pr-readiness"] });
    qc.invalidateQueries({ queryKey: ["pr-readiness-lite"] });
    qc.invalidateQueries({ queryKey: ["pr-packs"] });
    qc.invalidateQueries({ queryKey: ["pr-overview"] });
  };

  const filteredRows = (rows as any[]).filter((r) => {
    if (activeOnly && !r.is_active) return false;
    if (statusFilter !== "all" && (r.press_ready_status || "not_active") !== statusFilter) return false;
    if (complianceFilter !== "all" && (r.compliance_clearance_status || "not_checked") !== complianceFilter) return false;
    if (missingOnly && (r.missing_items ?? []).length === 0) return false;
    return true;
  });

  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-4">
      <ReadinessSyncPanel onDone={refresh} />
      <ReadinessEditButton row={null} label="Add manual press-readiness record" onDone={refresh} />
      <div className="rounded-md border border-border/40 bg-secondary/20 p-2 flex flex-wrap gap-2 items-center text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Active only</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
          <option value="all">Any readiness</option>
          {["ready","partially_ready","blocked","not_active"].map((v) => <option key={v}>{v}</option>)}
        </select>
        <select value={complianceFilter} onChange={(e) => setComplianceFilter(e.target.value)} className="rounded border border-border/40 bg-secondary/40 px-2 py-1">
          <option value="all">Any compliance</option>
          {["approved","clear","not_required","not_checked","blocked"].map((v) => <option key={v}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} /> With missing items</label>
      </div>
      {rows.length === 0 && packs.length === 0 ? (
        <EmptyState>No business press-readiness records yet. Sync from canonical businesses above or add a manual record.</EmptyState>
      ) : null}
      {filteredRows.length > 0 && (
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Press readiness</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Business</TableHead><TableHead>Active</TableHead><TableHead>Website</TableHead>
                <TableHead>Offer</TableHead><TableHead>Status</TableHead><TableHead>Compliance</TableHead>
                <TableHead>Approved assets</TableHead><TableHead>Missing</TableHead><TableHead>Edit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredRows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.business_name || (r.business_id ? r.business_id.slice(0, 8) : "—")}</TableCell>
                    <TableCell className="text-xs">{r.is_active ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-xs">{r.website_live ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-xs">{r.public_offer_live ? "Yes" : "—"}</TableCell>
                    <TableCell>{chip(r.press_ready_status || "not_active")}</TableCell>
                    <TableCell>{chip(r.compliance_clearance_status || "not_checked")}</TableCell>
                    <TableCell className="text-xs">{`${(r.approved_images ?? []).length} img · ${(r.approved_logo ?? []).length} logo · ${(r.approved_company_quotes ?? []).length} quote · ${(r.approved_claims ?? []).length} claim`}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate">{(r.missing_items ?? []).join(", ") || "—"}</TableCell>
                    <TableCell><ReadinessEditButton row={r} onDone={refresh} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {packs.length > 0 && (
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Press packs</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Business</TableHead><TableHead>Pack</TableHead><TableHead>One-line</TableHead>
                <TableHead>Quotes</TableHead><TableHead>Images</TableHead><TableHead>Logos</TableHead><TableHead>Claims</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {packs.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.business_id ? r.business_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="text-xs">{r.pack_name || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate">{r.one_line_description || "—"}</TableCell>
                    <TableCell className="text-xs">{(r.approved_quote_bank ?? []).length}</TableCell>
                    <TableCell className="text-xs">{(r.image_asset_links ?? []).length}</TableCell>
                    <TableCell className="text-xs">{(r.logo_asset_links ?? []).length}</TableCell>
                    <TableCell className="text-xs">{`${(r.approved_claims ?? []).length} ok · ${(r.blocked_claims ?? []).length} blocked`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReadinessSyncPanel({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<any | null>(null);
  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const { data, error } = await sb.functions.invoke("pr-press-readiness-sync", { body: { dry_run: dryRun } });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        toast.success(dryRun
          ? `Dry run: would insert ${data.would_insert} of ${data.businesses_seen}.`
          : `Synced: +${data.inserted}, ~${data.updated} of ${data.businesses_seen}.`);
        if (!dryRun) onDone?.();
      } else toast.error(data?.reason || data?.message || "Sync failed");
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally { setRunning(false); }
  };
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-primary" />Sync active businesses</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Seeds a press-readiness row for every business in the canonical <span className="font-mono">businesses</span> table.
          Never overwrites approved descriptions, assets, quotes or claims. Activation, website/offer status and approved
          content must be set manually below — Liftor will not auto-mark any business as press-ready.
        </p>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={running} /> Dry run</label>
          <Button size="sm" disabled={running} onClick={run}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />} Sync from canonical businesses
          </Button>
        </div>
        {result ? (
          <div className="rounded-md border border-border/40 bg-secondary/30 p-2 text-[11px]">
            {result.ok
              ? <span><b>Seen</b> {result.businesses_seen} · <b>+</b>{result.inserted ?? result.would_insert ?? 0} · <b>~</b>{result.updated ?? result.would_update ?? 0} {result.dry_run ? <i>· dry run</i> : null}</span>
              : <span>{result.reason}: {result.message}</span>}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const READY_STATUSES = ["not_active","blocked","partially_ready","ready"];
const COMPLIANCE_STATUSES = ["not_checked","not_required","approved","clear","blocked"];

function ReadinessEditButton({ row, onDone, label }: { row: any | null; onDone?: () => void; label?: string }) {
  const isNew = !row;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(() => ({
    business_id: row?.business_id || "",
    business_name: row?.business_name || "",
    is_active: !!row?.is_active,
    website_live: !!row?.website_live,
    public_offer_live: !!row?.public_offer_live,
    approved_one_line_description: row?.approved_one_line_description || "",
    approved_50_word_description: row?.approved_50_word_description || "",
    approved_150_word_description: row?.approved_150_word_description || "",
    approved_founder_quote: row?.approved_founder_quote || "",
    approved_press_contact: row?.approved_press_contact || "",
    compliance_clearance_status: row?.compliance_clearance_status || "not_checked",
    press_ready_status: row?.press_ready_status || "not_active",
    blocked_topics: (row?.blocked_topics ?? []).join(", "),
    approved_claims: (row?.approved_claims ?? []).map((c: any) => typeof c === "string" ? c : JSON.stringify(c)).join("\n"),
    approved_company_quotes: (row?.approved_company_quotes ?? []).map((c: any) => typeof c === "string" ? c : JSON.stringify(c)).join("\n"),
    approved_logo: (row?.approved_logo ?? []).join("\n"),
    approved_images: (row?.approved_images ?? []).join("\n"),
    approved_case_studies: (row?.approved_case_studies ?? []).map((c: any) => typeof c === "string" ? c : JSON.stringify(c)).join("\n"),
    missing_items: (row?.missing_items ?? []).join(", "),
  }));
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const splitLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const splitCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const save = async () => {
    if (isNew && !form.business_name.trim()) { toast.error("Business name required."); return; }
    setSaving(true);
    const patch: any = {
      business_name: form.business_name || null,
      is_active: !!form.is_active,
      website_live: !!form.website_live,
      public_offer_live: !!form.public_offer_live,
      approved_one_line_description: form.approved_one_line_description || null,
      approved_50_word_description: form.approved_50_word_description || null,
      approved_150_word_description: form.approved_150_word_description || null,
      approved_founder_quote: form.approved_founder_quote || null,
      approved_press_contact: form.approved_press_contact || null,
      compliance_clearance_status: form.compliance_clearance_status || "not_checked",
      press_ready_status: form.press_ready_status || "not_active",
      blocked_topics: splitCsv(form.blocked_topics),
      approved_claims: splitLines(form.approved_claims),
      approved_company_quotes: splitLines(form.approved_company_quotes),
      approved_logo: splitLines(form.approved_logo),
      approved_images: splitLines(form.approved_images),
      approved_case_studies: splitLines(form.approved_case_studies),
      missing_items: splitCsv(form.missing_items),
    };
    if (isNew && form.business_id.trim()) patch.business_id = form.business_id.trim();
    let error: any = null;
    if (isNew) ({ error } = await sb.from("business_press_readiness").insert(patch));
    else ({ error } = await sb.from("business_press_readiness").update(patch).eq("id", row.id));
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setOpen(false); onDone?.(); }
  };

  if (!open) return (
    <Button size="sm" variant={isNew ? "default" : "outline"} onClick={() => setOpen(true)}>
      {label || "Edit"}
    </Button>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setOpen(false)}>
      <Card className="tech-card max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isNew ? "New press-readiness record" : `Edit ${row?.business_name || "record"}`}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <label className="block">Business name
            <input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          {isNew ? (
            <label className="block">Business id (optional uuid; leave blank if unknown)
              <input value={form.business_id} onChange={(e) => set("business_id", e.target.value)} placeholder="uuid" className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1 font-mono" />
            </label>
          ) : null}
          <div className="flex gap-4">
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.website_live} onChange={(e) => set("website_live", e.target.checked)} /> Website live</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.public_offer_live} onChange={(e) => set("public_offer_live", e.target.checked)} /> Public offer live</label>
          </div>
          <label className="block">Press ready status
            <select value={form.press_ready_status} onChange={(e) => set("press_ready_status", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1">
              {READY_STATUSES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="block">Compliance clearance
            <select value={form.compliance_clearance_status} onChange={(e) => set("compliance_clearance_status", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1">
              {COMPLIANCE_STATUSES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="block">One-line description
            <input value={form.approved_one_line_description} onChange={(e) => set("approved_one_line_description", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">50-word description
            <textarea rows={2} value={form.approved_50_word_description} onChange={(e) => set("approved_50_word_description", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">150-word description
            <textarea rows={4} value={form.approved_150_word_description} onChange={(e) => set("approved_150_word_description", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Approved founder quote
            <textarea rows={2} value={form.approved_founder_quote} onChange={(e) => set("approved_founder_quote", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Approved company quotes (one per line)
            <textarea rows={3} value={form.approved_company_quotes} onChange={(e) => set("approved_company_quotes", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Approved claims (one per line)
            <textarea rows={3} value={form.approved_claims} onChange={(e) => set("approved_claims", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Approved case studies (one per line)
            <textarea rows={2} value={form.approved_case_studies} onChange={(e) => set("approved_case_studies", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Logo URLs (one per line)
            <textarea rows={2} value={form.approved_logo} onChange={(e) => set("approved_logo", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1 font-mono" />
          </label>
          <label className="block">Image URLs (one per line)
            <textarea rows={3} value={form.approved_images} onChange={(e) => set("approved_images", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1 font-mono" />
          </label>
          <label className="block">Press contact (email or note)
            <input value={form.approved_press_contact} onChange={(e) => set("approved_press_contact", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Blocked topics (comma-separated)
            <input value={form.blocked_topics} onChange={(e) => set("blocked_topics", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <label className="block">Missing items (comma-separated)
            <input value={form.missing_items} onChange={(e) => set("missing_items", e.target.value)} className="mt-0.5 w-full rounded border border-border/40 bg-secondary/40 px-2 py-1" />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={save}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------- Drafts -----------------
const APPROVAL_CLS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground border-border/50",
  needs_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  founder_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  founder_approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  gmail_draft_created: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  submitted_manual: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};
const RISK_CLS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  high: "bg-red-500/15 text-red-300 border-red-500/30",
};

function DraftGeneratePanel({ onDone }: { onDone?: () => void }) {
  const [matchId, setMatchId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const { data: eligible = [] } = useTable("pr-drafts-eligible-matches", async () => {
    const { data } = await sb.from("media_opportunity_matches")
      .select("id,opportunity_id,business_id,match_score,recommended_action,created_at")
      .in("recommended_action", ["draft_pitch", "request_assets", "prepare_only"])
      .order("match_score", { ascending: false }).limit(25);
    return data ?? [];
  });

  async function run() {
    if (!matchId) { toast.error("Choose or paste a match id"); return; }
    setBusy(true); setResult(null);
    try {
      const { data, error } = await sb.functions.invoke("pr-generate-pitch-draft", {
        body: { match_id: matchId, draft_mode: "template", dry_run: dryRun, force_regenerate: force },
      });
      if (error) throw error;
      setResult(data);
      if (data?.ok) toast.success(dryRun ? "Dry run complete" : (data.deduped ? "Existing draft returned" : "Draft generated"));
      else toast.error(`Blocked: ${data?.reason || "unknown"}`);
      onDone?.();
    } catch (e: any) { toast.error(e?.message || "Draft generation failed"); }
    finally { setBusy(false); }
  }

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Generate pitch draft</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="text-[11px] text-muted-foreground">
          Template-based draft generator. AI Gateway drafting is deferred — drafts never include private founder, entity, tax or family detail. No external send. Blocked for inactive or not-press-ready businesses.
        </div>
        <div className="grid md:grid-cols-3 gap-2 items-end">
          <div className="md:col-span-2">
            <label className="text-[11px] text-muted-foreground">Match id (or pick eligible below)</label>
            <Input value={matchId} onChange={(e) => setMatchId(e.target.value)} placeholder="match uuid" className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry run</label>
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Force regen</label>
          </div>
        </div>
        {eligible.length ? (
          <div className="max-h-32 overflow-auto rounded border border-border/40 p-1">
            {eligible.map((m: any) => (
              <button key={m.id} className={`block w-full text-left text-[11px] px-2 py-1 rounded hover:bg-secondary/40 ${matchId === m.id ? "bg-secondary/60" : ""}`}
                onClick={() => setMatchId(m.id)}>
                <span className="font-mono">{m.id.slice(0, 8)}</span> · score {m.match_score} · <i>{m.recommended_action}</i> · opp {m.opportunity_id?.slice(0,8)} · biz {m.business_id?.slice(0,8)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={run} disabled={busy}>{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Generate</Button>
          {result ? (
            <div className="text-[11px] text-muted-foreground">
              {result.ok
                ? <>send={result.send_method} · risk={result.risk_level} · approval={result.approval_status} · missing={(result.missing_assets || []).length}{result.deduped ? " · existing" : ""}{result.dry_run ? " · dry" : ""}</>
                : <span className="text-red-300">{result.reason}</span>}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DraftDetailDialog({ id, open, onOpenChange, onChanged }: { id: string | null; open: boolean; onOpenChange: (v: boolean) => void; onChanged: () => void }) {
  const [row, setRow] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    if (!id) { setRow(null); return; }
    const { data } = await sb.from("media_pitch_drafts").select("*").eq("id", id).maybeSingle();
    setRow(data ?? null);
  }
  // load on open
  useMemo(() => { if (open && id) load(); /* eslint-disable-next-line */ }, [open, id]);

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl"><div className="text-xs text-muted-foreground">Loading…</div></DialogContent>
      </Dialog>
    );
  }

  async function patch(p: any) {
    setRow({ ...row, ...p });
  }
  async function save() {
    setSaving(true);
    try {
      const { error } = await sb.from("media_pitch_drafts").update({
        draft_subject: row.draft_subject,
        draft_body: row.draft_body,
        quote_options: row.quote_options,
        asset_checklist: row.asset_checklist,
        platform_instructions: row.platform_instructions,
        compliance_notes: row.compliance_notes,
        risk_level: row.risk_level,
        approval_status: row.approval_status,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (error) throw error;
      toast.success("Saved");
      onChanged();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  }
  async function decide(status: "founder_approved" | "rejected" | "needs_review") {
    setActing(status);
    try {
      const patch: any = { approval_status: status, updated_at: new Date().toISOString() };
      if (status === "founder_approved") patch.founder_approved_at = new Date().toISOString();
      const { error } = await sb.from("media_pitch_drafts").update(patch).eq("id", row.id);
      if (error) throw error;
      await sb.from("pr_audit_events").insert({
        event_type: status === "founder_approved" ? "pr_pitch_draft_approved" : status === "rejected" ? "pr_pitch_draft_rejected" : "pr_pitch_draft_returned",
        summary: `Draft ${status}`,
        details: { draft_id: row.id },
      });
      toast.success(`Draft ${status.replace("_", " ")}`);
      setRow({ ...row, ...patch });
      onChanged();
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
    finally { setActing(null); }
  }
  async function createGmailDraft(dry = false) {
    setActing("gmail");
    try {
      const { data, error } = await sb.functions.invoke("pr-create-gmail-draft", { body: { pitch_draft_id: row.id, dry_run: dry } });
      if (error) throw error;
      if (!data?.ok) { toast.error(data?.reason || "Gmail draft failed"); return; }
      if (dry) toast.success(`Dry: would send to ${data.recipient_preview}`);
      else { toast.success("Gmail draft created. It has not been sent."); await load(); onChanged(); }
    } catch (e: any) { toast.error(e?.message || "Gmail draft failed"); }
    finally { setActing(null); }
  }
  async function markPlatformSubmitted() {
    setActing("platform");
    try {
      const platformName = window.prompt("Platform name (Qwoted, HARO, …):", "Qwoted") || null;
      const note = window.prompt("Submission note (optional):", "") || null;
      const { data, error } = await sb.functions.invoke("pr-mark-platform-submission", { body: { pitch_draft_id: row.id, platform_name: platformName, submission_note: note } });
      if (error) throw error;
      if (!data?.ok) { toast.error(data?.reason || "Failed"); return; }
      toast.success("Marked submitted");
      await load(); onChanged();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setActing(null); }
  }
  async function copyMessage() {
    const txt = `${row.draft_subject || ""}\n\n${row.draft_body || ""}${row.platform_instructions ? `\n\n— Platform instructions —\n${row.platform_instructions}` : ""}`;
    try { await navigator.clipboard.writeText(txt); toast.success("Copied to clipboard"); } catch { toast.error("Copy failed"); }
  }

  const canGmail = row.approval_status === "founder_approved" && row.send_method === "gmail_draft";
  const canPlatform = row.send_method === "platform_copy_paste" || row.send_method === "manual_review_only";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Pitch draft</DialogTitle>
          <DialogDescription className="text-[11px]">
            Approving allows Liftor to create a Gmail draft or prepare platform-copy workflow only. It does not send anything.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap gap-2">
            {chip(row.approval_status || "draft", APPROVAL_CLS[row.approval_status || "draft"])}
            {chip(`risk ${row.risk_level || "medium"}`, RISK_CLS[row.risk_level || "medium"])}
            {chip(`send ${row.send_method || "manual_review_only"}`)}
            {row.created_by_ai ? chip("AI-assisted") : chip("template")}
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Subject</label>
            <Input value={row.draft_subject || ""} onChange={(e) => patch({ draft_subject: e.target.value })} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Body</label>
            <Textarea value={row.draft_body || ""} onChange={(e) => patch({ draft_body: e.target.value })} className="text-xs font-mono" rows={14} />
          </div>
          {row.platform_instructions != null ? (
            <div>
              <label className="text-[11px] text-muted-foreground">Platform instructions</label>
              <Textarea value={row.platform_instructions || ""} onChange={(e) => patch({ platform_instructions: e.target.value })} className="text-xs" rows={4} />
            </div>
          ) : null}
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Quote options (JSON)</label>
              <Textarea value={JSON.stringify(row.quote_options ?? [], null, 2)} onChange={(e) => { try { patch({ quote_options: JSON.parse(e.target.value) }); } catch {} }} className="text-[11px] font-mono" rows={4} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Asset checklist (JSON)</label>
              <Textarea value={JSON.stringify(row.asset_checklist ?? [], null, 2)} onChange={(e) => { try { patch({ asset_checklist: JSON.parse(e.target.value) }); } catch {} }} className="text-[11px] font-mono" rows={4} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Compliance notes</label>
            <Textarea value={row.compliance_notes || ""} onChange={(e) => patch({ compliance_notes: e.target.value })} className="text-xs" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Risk level</label>
              <select value={row.risk_level || "medium"} onChange={(e) => patch({ risk_level: e.target.value })} className="w-full h-8 text-xs rounded border border-input bg-background px-2">
                {["low", "medium", "high"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Approval status</label>
              <select value={row.approval_status || "draft"} onChange={(e) => patch({ approval_status: e.target.value })} className="w-full h-8 text-xs rounded border border-input bg-background px-2">
                {["draft","needs_review","founder_review","founder_approved","rejected","gmail_draft_created","submitted_manual"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
            <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save edits</Button>
            <Button size="sm" variant="outline" onClick={() => decide("needs_review")} disabled={!!acting}>Send to review</Button>
            <Button size="sm" onClick={() => decide("founder_approved")} disabled={!!acting}><Check className="h-3 w-3" /> Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => decide("rejected")} disabled={!!acting}><XIcon className="h-3 w-3" /> Reject</Button>
            <Button size="sm" variant="outline" onClick={copyMessage}><Copy className="h-3 w-3" /> Copy message</Button>
            {canGmail ? (
              <>
                <Button size="sm" variant="outline" onClick={() => createGmailDraft(true)} disabled={!!acting}>Gmail dry run</Button>
                <Button size="sm" onClick={() => createGmailDraft(false)} disabled={!!acting}><Mail className="h-3 w-3" /> Create Gmail draft</Button>
              </>
            ) : null}
            {canPlatform ? (
              <Button size="sm" variant="outline" onClick={markPlatformSubmitted} disabled={!!acting}><Send className="h-3 w-3" /> Mark submitted</Button>
            ) : null}
          </div>
          <div className="text-[11px] text-muted-foreground pt-1">
            No external send. Gmail action only creates a draft inside Gmail. Platform-only contact must happen inside the platform; no scraping, no automated send.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DraftsTab() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["pr-drafts"] }); qc.invalidateQueries({ queryKey: ["pr-overview"] }); };

  const { data: rows = [], isLoading } = useTable("pr-drafts", async () => {
    const { data } = await sb.from("media_pitch_drafts")
      .select("id,opportunity_id,business_id,draft_subject,send_method,approval_status,risk_level,created_by_ai,created_at,founder_approved_at")
      .order("created_at", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });

  return (
    <div className="space-y-3">
      <DraftGeneratePanel onDone={refresh} />
      <div className="text-[11px] text-muted-foreground">
        Approval workflow. No external sending in this build. Gmail action creates a draft only. Platform-only routes use copy / mark-submitted.
      </div>
      {isLoading ? <div className="text-xs text-muted-foreground">Loading…</div> :
       rows.length === 0 ? <EmptyState>No pitch drafts yet. Generate from an eligible match above. Inactive or not-press-ready businesses are blocked at the generator.</EmptyState> :
       (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Subject</TableHead><TableHead>Opportunity</TableHead><TableHead>Business</TableHead>
            <TableHead>Send</TableHead><TableHead>Approval</TableHead><TableHead>Risk</TableHead><TableHead>AI?</TableHead>
            <TableHead>Created</TableHead><TableHead>Approved</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs max-w-[260px] truncate">{r.draft_subject || "—"}</TableCell>
                <TableCell className="text-[11px] font-mono">{r.opportunity_id ? r.opportunity_id.slice(0, 8) : "—"}</TableCell>
                <TableCell className="text-[11px] font-mono">{r.business_id ? r.business_id.slice(0, 8) : "—"}</TableCell>
                <TableCell className="text-xs">{r.send_method || "manual_review_only"}</TableCell>
                <TableCell>{chip(r.approval_status || "draft", APPROVAL_CLS[r.approval_status || "draft"])}</TableCell>
                <TableCell>{chip(r.risk_level || "medium", RISK_CLS[r.risk_level || "medium"])}</TableCell>
                <TableCell className="text-xs">{r.created_by_ai ? "Yes" : "—"}</TableCell>
                <TableCell className="text-xs">{fmtDateShort(r.created_at)}</TableCell>
                <TableCell className="text-xs">{fmtDateShort(r.founder_approved_at)}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <DraftDetailDialog id={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} onChanged={refresh} />
    </div>
  );
}

// ----------------- Campaigns -----------------
function CampaignsTab() {
  const { data: rows = [], isLoading } = useTable("pr-campaigns", async () => {
    const { data } = await sb.from("quarterly_pr_campaigns")
      .select("id,business_id,quarter,year,campaign_theme,target_markets,owned_article_needed,status,due_date,founder_approval_status")
      .order("due_date", { ascending: true, nullsFirst: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <EmptyState>Quarterly PR planner will be activated in Phase 10.</EmptyState>;
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Business</TableHead><TableHead>Quarter</TableHead><TableHead>Theme</TableHead>
        <TableHead>Markets</TableHead><TableHead>Owned article</TableHead><TableHead>Status</TableHead>
        <TableHead>Due</TableHead><TableHead>Approval</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{r.business_id ? r.business_id.slice(0, 8) : "—"}</TableCell>
            <TableCell className="text-xs">{[r.quarter, r.year].filter(Boolean).join(" ") || "—"}</TableCell>
            <TableCell className="text-xs max-w-[260px] truncate">{r.campaign_theme || "—"}</TableCell>
            <TableCell className="text-xs max-w-[220px] truncate">{(r.target_markets ?? []).join(", ") || "—"}</TableCell>
            <TableCell className="text-xs">{r.owned_article_needed ? "Yes" : "—"}</TableCell>
            <TableCell>{chip(r.status || "planned")}</TableCell>
            <TableCell className="text-xs">{fmtDateShort(r.due_date)}</TableCell>
            <TableCell>{chip(r.founder_approval_status || "not_requested")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ----------------- Owned Media -----------------
function OwnedMediaTab() {
  const { data: rows = [], isLoading } = useTable("pr-owned", async () => {
    const { data } = await sb.from("owned_media_articles")
      .select("id,business_id,title,article_type,publication_status,approval_status,publish_url,created_at")
      .order("created_at", { ascending: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <EmptyState>No owned-media articles yet.</EmptyState>;
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Business</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead>
        <TableHead>Publication</TableHead><TableHead>Approval</TableHead><TableHead>URL</TableHead><TableHead>Created</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{r.business_id ? r.business_id.slice(0, 8) : "—"}</TableCell>
            <TableCell className="text-xs max-w-[260px] truncate">{r.title || "—"}</TableCell>
            <TableCell className="text-xs">{r.article_type || "—"}</TableCell>
            <TableCell>{chip(r.publication_status || "draft")}</TableCell>
            <TableCell>{chip(r.approval_status || "draft")}</TableCell>
            <TableCell className="text-xs max-w-[200px] truncate">{r.publish_url || "—"}</TableCell>
            <TableCell className="text-xs">{fmtDateShort(r.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ----------------- Coverage -----------------
function CoverageTab() {
  const { data: rows = [], isLoading } = useTable("pr-coverage", async () => {
    const { data } = await sb.from("coverage_mentions")
      .select("id,business_id,publication_name,article_title,article_url,published_at,coverage_type,backlink_url,seo_value_score,featured_in_allowed,reuse_permission_status")
      .order("published_at", { ascending: false, nullsFirst: false }).limit(ROW_LIMIT);
    return data ?? [];
  });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <EmptyState>No coverage mentions recorded yet.</EmptyState>;
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Business</TableHead><TableHead>Publication</TableHead><TableHead>Title</TableHead>
        <TableHead>Published</TableHead><TableHead>Type</TableHead><TableHead>URL</TableHead>
        <TableHead>Backlink</TableHead><TableHead>SEO</TableHead><TableHead>Feat. allowed</TableHead><TableHead>Reuse</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{r.business_id ? r.business_id.slice(0, 8) : "—"}</TableCell>
            <TableCell className="text-xs">{r.publication_name || "—"}</TableCell>
            <TableCell className="text-xs max-w-[240px] truncate">{r.article_title || "—"}</TableCell>
            <TableCell className="text-xs">{fmtDateShort(r.published_at)}</TableCell>
            <TableCell className="text-xs">{r.coverage_type || "—"}</TableCell>
            <TableCell className="text-xs max-w-[160px] truncate">{r.article_url || "—"}</TableCell>
            <TableCell className="text-xs max-w-[160px] truncate">{r.backlink_url || "—"}</TableCell>
            <TableCell className="text-xs tabular-nums">{r.seo_value_score ?? 0}</TableCell>
            <TableCell className="text-xs">{r.featured_in_allowed ? "Yes" : "—"}</TableCell>
            <TableCell>{chip(r.reuse_permission_status || "unknown")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ----------------- Risk & Audit -----------------
function RiskAuditTab() {
  const { data: risks = [] } = useTable("pr-risks", async () => {
    const { data } = await sb.from("pr_risk_events").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });
  const { data: audits = [] } = useTable("pr-audits", async () => {
    const { data } = await sb.from("pr_audit_events").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent risk events</CardTitle></CardHeader>
        <CardContent>
          {risks.length === 0 ? <EmptyState>No PR risk events recorded. Events will appear when automation or actions are added.</EmptyState> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Category</TableHead><TableHead>Level</TableHead><TableHead>Description</TableHead><TableHead>Recommended</TableHead></TableRow></TableHeader>
              <TableBody>
                {risks.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-xs">{r.risk_category || "—"}</TableCell>
                    <TableCell>{chip(r.risk_level || "—")}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate">{r.description || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[220px] truncate">{r.recommended_action || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent audit events</CardTitle></CardHeader>
        <CardContent>
          {audits.length === 0 ? <EmptyState>No PR audit events recorded yet. Audit entries appear when founder actions are taken.</EmptyState> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Related</TableHead><TableHead>Summary</TableHead></TableRow></TableHeader>
              <TableBody>
                {audits.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-xs">{r.event_type || "—"}</TableCell>
                    <TableCell className="text-xs">{[r.related_type, r.related_id ? r.related_id.slice(0, 8) : null].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate">{r.event_summary || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------- Settings -----------------
function SettingsTab() {
  const labels = [
    "Liftor/PR Opportunities",
    "Liftor/PR Opportunities/Editorielle",
    "Liftor/PR Opportunities/Source of Sources",
    "Liftor/PR Opportunities/HARO",
    "Liftor/PR Opportunities/Qwoted",
    "Liftor/PR Opportunities/PressPlugs",
    "Liftor/PR Opportunities/ResponseSource",
  ];
  const schedule = [
    ["Main planned worker", "13:15 UK weekdays"],
    ["Human review calendar control point", "13:30 UK weekdays"],
    ["Urgent scan planned worker", "17:30 UK weekdays"],
    ["Human urgent check", "17:45 UK weekdays"],
    ["Three-month review", "15 September 2026"],
  ];
  const rules = [
    "Editorielle / Source of Sources / HARO / PressPlugs / ResponseSource = email-feed sources.",
    "Qwoted = platform-only intelligence. Prepare copy and open platform; do not scrape, export or bulk-email.",
    "Featured = parked.",
    "Muck Rack / Cision / Vuelio / Meltwater = future paid/demo platforms.",
    "GDELT = future public-web intelligence.",
  ];
  const safety = [
    "No external PR pitch is sent without founder approval.",
    "No public figure / expert / philanthropist is described as endorsing or supporting unless permission is recorded.",
    "Do not expose Liftor private architecture, tax/entity/adviser structure, family/school details or non-public business details.",
    "Only active/live businesses should be pitched.",
    "No Qwoted scraping. No LinkedIn scraping. No automated scraping of logged-in platforms.",
    "No implied endorsement from any sector leader, patron or philanthropist.",
    "Platform-only means: open platform, copy approved message, mark contacted later. Liftor does not send.",
    "Direct email contact to a journalist requires a lawful contact route and founder approval.",
    "Press-ready means a live public offer/website, approved assets, claims, quotes and compliance clearance are all in place.",
    "Blocked topics on a business override the match score and force a 'block' recommendation.",
    "Inactive or partially-ready businesses are never marked draft_pitch — they are blocked, parked or marked needs_assets.",
  ];

  const Block = ({ title, items }: { title: string; items: (string | string[])[] }) => (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="text-xs space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">·</span>
              {Array.isArray(it) ? (<><span className="font-medium min-w-[220px]">{it[0]}</span><span className="text-muted-foreground">{it[1]}</span></>) : <span>{it}</span>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Block title="Gmail labels expected" items={labels} />
      <Block title="Schedule" items={schedule} />
      <Block title="Source rules" items={rules} />
      <Block title="Safety guidance" items={safety} />
    </div>
  );
}

// ----------------- Page -----------------
export default function GlobalPrRadar() {
  const tabs = useMemo(() => ([
    { v: "overview", label: "Overview", node: <OverviewTab /> },
    { v: "sources", label: "Sources", node: <SourcesTab /> },
    { v: "inbound", label: "Inbound Messages", node: <InboundTab /> },
    { v: "opportunities", label: "Opportunities", node: <OpportunitiesTab /> },
    { v: "atlas", label: "Media Atlas", node: <MediaAtlasTab /> },
    { v: "readiness", label: "Press Readiness", node: <ReadinessTab /> },
    { v: "drafts", label: "Pitch Drafts", node: <DraftsTab /> },
    { v: "campaigns", label: "Quarterly PR", node: <CampaignsTab /> },
    { v: "owned", label: "Owned Media", node: <OwnedMediaTab /> },
    { v: "coverage", label: "Coverage", node: <CoverageTab /> },
    { v: "risk", label: "Risk & Audit", node: <RiskAuditTab /> },
    { v: "settings", label: "Settings", node: <SettingsTab /> },
  ]), []);

  return (
    <FounderLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Global PR Radar & Media Atlas</h1>
              <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]"><Lock className="h-3 w-3 mr-1" />Founder-only</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Media opportunities, journalists, expert sources, quarterly PR, owned media and coverage control.</p>
          </div>
          <Link to="/founder/command-centre"><Button size="sm" variant="outline"><ArrowLeft className="h-4 w-4 mr-1" />Command Centre</Button></Link>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto">
            {tabs.map(t => <TabsTrigger key={t.v} value={t.v}>{t.label}</TabsTrigger>)}
          </TabsList>
          {tabs.map(t => (
            <TabsContent key={t.v} value={t.v} className="mt-4">
              <Card className="tech-card">
                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                  {t.v === "settings" ? <SettingsIcon className="h-4 w-4 text-primary" /> : null}
                  <CardTitle className="text-sm">{t.label}</CardTitle>
                </CardHeader>
                <CardContent>{t.node}</CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </FounderLayout>
  );
}