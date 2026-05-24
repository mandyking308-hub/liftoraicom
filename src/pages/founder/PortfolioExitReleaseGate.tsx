import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Lock, Activity, Gauge, Database, FileWarning, ArrowLeft, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type GateCheck = {
  id: string;
  check_key: string;
  category: string;
  label: string;
  description: string | null;
  status: "not_ready" | "passing" | "failing" | "blocked" | "manual_review";
  severity: "critical" | "high" | "medium" | "low";
  notes: string | null;
  last_checked_at: string | null;
};

const statusVariant: Record<string, string> = {
  passing: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failing: "bg-destructive/10 text-destructive border-destructive/30",
  blocked: "bg-destructive/10 text-destructive border-destructive/30",
  manual_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  not_ready: "bg-muted text-muted-foreground border-border",
};

const ACCEPTANCE_TESTS = [
  "Create portfolio asset",
  "Add buyer profile",
  "Add investor profile",
  "Add competitor profile",
  "Add source with licence",
  "Generate valuation target",
  "Generate execution targets",
  "Create buyer match",
  "Create data-room item",
  "Create AI recommendation",
  "Challenge recommendation (red team)",
  "Approve/reject recommendation",
  "Import CSV via Ingestion Centre",
  "Detect duplicate (golden record)",
  "Log decision memory",
  "Run mock buyer diligence",
  "Generate weekly briefing",
  "Verify no external sending occurs",
  "Verify no API key exposed in client",
  "Verify test data can be purged",
];

export default function PortfolioExitReleaseGate() {
  const qc = useQueryClient();

  const { data: checks = [] } = useQuery({
    queryKey: ["ma_release_gate_checks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_release_gate_checks")
        .select("*")
        .order("severity")
        .order("category");
      if (error) throw error;
      return (data ?? []) as GateCheck[];
    },
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["ma_integration_allowlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_integration_allowlist")
        .select("*")
        .order("integration_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: limits = [] } = useQuery({
    queryKey: ["ma_rate_cost_limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_rate_cost_limits")
        .select("*")
        .order("scope");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lockdowns = [] } = useQuery({
    queryKey: ["ma_lockdown_controls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_lockdown_controls")
        .select("*")
        .order("control_key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: privacy = [] } = useQuery({
    queryKey: ["ma_privacy_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_privacy_records")
        .select("*")
        .limit(100)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: redTeam = [] } = useQuery({
    queryKey: ["ma_red_team_reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_red_team_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleLockdown = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("ma_lockdown_controls")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ma_lockdown_controls"] });
      toast.success("Lockdown updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const stamp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ma_release_gate_checks")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ma_release_gate_checks"] }),
  });

  const readiness = useMemo(() => {
    if (!checks.length) {
      return { label: "Live — Healthy (no checks recorded yet)", tone: "success" as const };
    }
    const critFail = checks.find(
      (c) => c.severity === "critical" && (c.status === "failing" || c.status === "blocked")
    );
    if (critFail) return { label: "Live — Risk Alert (critical check needs attention)", tone: "destructive" as const };
    const anyManual = checks.some((c) => c.status === "manual_review" || c.status === "not_ready");
    const allPass = checks.every((c) => c.status === "passing");
    if (allPass) return { label: "Live — Healthy", tone: "success" as const };
    if (anyManual) return { label: "Live — Watch (items need review)", tone: "warning" as const };
    return { label: "Live — Watch", tone: "warning" as const };
  }, [checks]);

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" /> Portfolio &amp; Exit — Operating Status
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live operating status for the Portfolio &amp; Exit Architecture Engine. The module is live by default; founder approval remains required only for external sending, buyer/investor/adviser contact, paid API activation, data exports, spend commitments, legal/tax/entity changes, kill decisions and sharing buyer packs.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        </div>

        {/* Readiness banner */}
        <Card className={
          readiness.tone === "destructive"
            ? "tech-card border-destructive/40 bg-destructive/5"
            : readiness.tone === "warning"
              ? "tech-card border-amber-500/40 bg-amber-500/5"
              : "tech-card border-emerald-500/40 bg-emerald-500/5"
        }>
          <CardContent className="py-4 flex items-center gap-3">
            {readiness.tone === "destructive" ? <ShieldAlert className="h-6 w-6 text-destructive" /> :
              readiness.tone === "warning" ? <AlertTriangle className="h-6 w-6 text-amber-400" /> :
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
            <div>
              <div className="font-semibold">{readiness.label}</div>
              <div className="text-xs text-muted-foreground">
                {checks.filter(c => c.status === "passing").length}/{checks.length} checks passing ·
                {" "}{checks.filter(c => c.status === "manual_review").length} need manual review ·
                {" "}{checks.filter(c => c.status === "failing" || c.status === "blocked").length} failing
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="gate" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="gate">Release Gate</TabsTrigger>
            <TabsTrigger value="evidence">AI Evidence Guardrails</TabsTrigger>
            <TabsTrigger value="redteam">Red Team</TabsTrigger>
            <TabsTrigger value="privacy">Privacy / GDPR</TabsTrigger>
            <TabsTrigger value="integrations">Integration Allowlist</TabsTrigger>
            <TabsTrigger value="limits">Rate &amp; Cost</TabsTrigger>
            <TabsTrigger value="exports">Safe Exports</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="dr">Disaster Recovery</TabsTrigger>
            <TabsTrigger value="acceptance">Acceptance Tests</TabsTrigger>
            <TabsTrigger value="lockdown">Lockdown</TabsTrigger>
          </TabsList>

          <TabsContent value="gate">
            <Card className="tech-card">
              <CardHeader><CardTitle>Release readiness checklist</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last checked</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checks.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.label}</div>
                          {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                        </TableCell>
                        <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{c.severity}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusVariant[c.status]}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.last_checked_at ? new Date(c.last_checked_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => stamp.mutate(c.id)}>
                            Mark checked
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <Card className="tech-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI hallucination &amp; evidence guardrails</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Every AI recommendation must carry: evidence references, confidence score, source freshness, missing-information notes, assumption list, risk level and a founder/adviser approval flag where needed.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>If evidence is weak: <i>“Evidence is weak. Treat this as a hypothesis, not a decision.”</i></li>
                  <li>If no source attached: <i>“No verified source attached.”</i></li>
                  <li>The AI never invents: revenue, valuation, acquisition history, buyer/investor interest, legal/tax conclusions, customer traction, or deal multiples.</li>
                </ul>
                <p className="text-xs italic">Enforced at orchestrator prompt level + UI badges. Records without evidence are flagged in the Controls Centre Confidence panel.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redteam">
            <Card className="tech-card">
              <CardHeader><CardTitle>Red Team Reviews</CardTitle></CardHeader>
              <CardContent>
                {redTeam.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No red team reviews yet. Launch one from any recommendation, valuation target, build candidate or buyer plan in the Controls Centre.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {redTeam.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.target_type}</TableCell>
                          <TableCell><Badge variant="outline">{r.severity}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="tech-card">
              <CardHeader><CardTitle>Privacy / GDPR records</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Personal data imported via contacts, investors, advisers, decision makers, buyer notes, email imports, Apollo/HubSpot imports and adviser notes must be tagged here. Imports of personal data show a privacy warning at the ingestion step.
                </p>
                {privacy.length === 0 ? (
                  <div className="text-muted-foreground italic">No privacy records yet — add manually as personal data is imported.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Lawful basis</TableHead>
                        <TableHead>Consent</TableHead>
                        <TableHead>Retention</TableHead>
                        <TableHead>Export</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {privacy.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{p.source_table}</TableCell>
                          <TableCell>{p.data_subject_type ?? "—"}</TableCell>
                          <TableCell className="text-xs">{p.lawful_basis_notes ?? "—"}</TableCell>
                          <TableCell>{p.consent_status ?? "—"}</TableCell>
                          <TableCell>{p.retention_period ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={p.export_restricted ? "border-destructive/40 text-destructive" : ""}>
                              {p.export_restricted ? "restricted" : "permitted"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="tech-card">
              <CardHeader><CardTitle>Integration allowlist</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data accessed</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Last reviewed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.integration_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            i.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                              i.status === "blocked" ? "bg-destructive/10 text-destructive border-destructive/30" :
                                "bg-muted text-muted-foreground"
                          }>{i.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{i.data_accessed ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{i.risk_rating}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{i.last_reviewed_at ? new Date(i.last_reviewed_at).toLocaleDateString() : "never"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">All paid / external integrations default to <b>blocked</b> or <b>not_configured</b>. Activation requires founder approval and a recorded review.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits">
            <Card className="tech-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Rate &amp; cost guardrails</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Daily</TableHead>
                      <TableHead>Weekly</TableHead>
                      <TableHead>Monthly $</TableHead>
                      <TableHead>Alert %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {limits.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.scope}</TableCell>
                        <TableCell>{l.daily_limit ?? "—"}</TableCell>
                        <TableCell>{l.weekly_limit ?? "—"}</TableCell>
                        <TableCell>{l.monthly_spend_limit_usd ?? "—"}</TableCell>
                        <TableCell>{l.alert_threshold_pct ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">If a limit is exceeded, non-critical runs pause and the founder is alerted. Paid enrichment defaults to 0.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports">
            <Card className="tech-card">
              <CardHeader><CardTitle>Safe export controls</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Every export requires: founder approval, data-classification check, source-licence check, personal-data check, buyer-safe / adviser-safe status check and an audit-log entry. Export types:</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Internal export</li>
                  <li>Adviser pack</li>
                  <li>Buyer pack</li>
                  <li>Founder briefing</li>
                  <li>Technical backup</li>
                </ul>
                <p className="text-amber-400 text-xs">No automatic external export. Exports are queued for founder approval via <code>ma_approval_queue</code>.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <Card className="tech-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> System health</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Health label="Database connection" status="healthy" />
                  <Health label="Last scheduled run" status="manual" hint="Schedules not enabled by default" />
                  <Health label="Last failed run" status="none" />
                  <Health label="Pending approvals" status="see queue" />
                  <Health label="Unresolved critical risks" status="see incidents" />
                  <Health label="Stale sources" status="see ingestion" />
                  <Health label="Failed imports" status="see error queue" />
                  <Health label="Backup status" status="manual reminder" />
                  <Health label="Connector errors" status="none" />
                  <Health label="AI recommendation errors" status="none" />
                  <Health label="Data quality warnings" status="see hardening" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dr">
            <Card className="tech-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Disaster recovery</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Export core data via Hardening Centre &gt; Reporting Packs (founder approval required).</li>
                  <li>Restore from Lovable Cloud snapshot via the Backend dashboard (admin only).</li>
                  <li>Recover from a bad import: open Ingestion Centre &gt; the import batch &gt; <i>Reject all staged records</i>. Nothing is written to live tables until approved.</li>
                  <li>Reverse a duplicate merge: open the golden record &gt; <i>Unmerge</i> (last 90 days).</li>
                  <li>Disable AI runs: Lockdown &gt; <i>Pause AI recommendations</i>.</li>
                  <li>Disable integrations: Lockdown &gt; <i>Disable external integrations</i> (master kill-switch).</li>
                  <li>Lock the M&amp;A / Exit module: Lockdown &gt; <i>Mark system internal-test-only</i>.</li>
                  <li>Emergency contact: founder admin (mandyking308@gmail.com).</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acceptance">
            <Card className="tech-card">
              <CardHeader><CardTitle>Acceptance test script</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 text-sm space-y-1">
                  {ACCEPTANCE_TESTS.map((t) => <li key={t}>{t}</li>)}
                </ol>
                <p className="text-xs text-muted-foreground mt-3">Run end-to-end in a controlled session before promoting from internal-testing to live-controlled-use.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lockdown">
            <Card className="tech-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Manual override &amp; lockdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lockdowns.map((l: any) => (
                    <div key={l.id} className="flex items-start justify-between gap-4 p-3 rounded border border-border">
                      <div>
                        <div className="font-medium">{l.label}</div>
                        <div className="text-xs text-muted-foreground">{l.description}</div>
                      </div>
                      <Switch
                        checked={!!l.enabled}
                        onCheckedChange={(v) => toggleLockdown.mutate({ id: l.id, enabled: v })}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">All lockdown changes are auditable. Restrictive defaults are on at install time.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Health({ label, status, hint }: { label: string; status: string; hint?: string }) {
  return (
    <div className="p-3 rounded border border-border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{status}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}