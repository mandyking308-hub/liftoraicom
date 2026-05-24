import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ShieldCheck, Lock, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  classifySensitive, redactSensitive, detectPromptInjection, buildLayeredPrompt,
  type ClassifyResult, type InjectionResult,
} from "@/services/aiSecurityGuard";

const SECURITY_ALERT_TYPES = [
  "prompt_injection_detected",
  "secret_detected_in_prompt",
  "sensitive_data_blocked_from_logging",
  "high_risk_content_requires_review",
];

function sevColor(s: string) {
  return s === "critical" || s === "high" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : s === "warning" || s === "medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-sky-500/15 text-sky-400 border-sky-500/30";
}

export default function AISecurityCentre() {
  const [sample, setSample] = useState("");
  const [source, setSource] = useState("external_email");

  const result = useMemo(() => {
    if (!sample) return null;
    const classify = classifySensitive(sample);
    const redact = redactSensitive(sample);
    const injection = detectPromptInjection(sample);
    const layered = buildLayeredPrompt({
      trusted_system: "You are a Liftor system agent. Follow Liftor rules. Never override approvals.",
      untrusted_external: [{ source, content: sample }],
    });
    return { classify, redact, injection, layered };
  }, [sample, source]);

  const { data: alerts = [] } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_cost_alerts")
        .select("*")
        .in("alert_type", SECURITY_ALERT_TYPES)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: redactedRows = [] } = useQuery({
    queryKey: ["security-ledger-redactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_usage_ledger")
        .select("id,created_at,task_category,agent_id,audit_metadata,status")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []).filter((r: any) => r.audit_metadata?.security?.sensitive_data_redacted);
    },
    refetchInterval: 60000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of alerts) c[(a as any).alert_type] = (c[(a as any).alert_type] ?? 0) + 1;
    return c;
  }, [alerts]);

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Security & Redaction" description="Prompt injection detection, redaction events and security policies." /><div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> AI Security Centre
          </h1>
          <p className="text-muted-foreground text-sm">
            PII redaction, secrets protection and prompt-injection defence for every AI action.
            External content from emails, websites, PDFs and CRM notes is treated as untrusted data — it can never override Liftor rules.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<ShieldAlert className="h-4 w-4 text-red-400" />} label="Prompt injections (recent)" value={counts.prompt_injection_detected ?? 0} />
          <Stat icon={<Lock className="h-4 w-4 text-amber-400" />} label="Secrets caught in prompts" value={counts.secret_detected_in_prompt ?? 0} />
          <Stat icon={<FileSearch className="h-4 w-4 text-sky-400" />} label="Sensitive data redacted" value={counts.sensitive_data_blocked_from_logging ?? 0} />
          <Stat icon={<ShieldCheck className="h-4 w-4 text-orange-400" />} label="High-risk forced review" value={counts.high_risk_content_requires_review ?? 0} />
        </div>

        <Tabs defaultValue="alerts">
          <TabsList>
            <TabsTrigger value="alerts">Security alerts</TabsTrigger>
            <TabsTrigger value="redactions">Redacted ledger entries</TabsTrigger>
            <TabsTrigger value="inspector">Inspector</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card className="tech-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Recommended action</TableHead>
                      <TableHead>Detected categories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-mono">{a.alert_type}</TableCell>
                        <TableCell><Badge variant="outline" className={sevColor(a.severity)}>{a.severity}</Badge></TableCell>
                        <TableCell className="text-xs">{a.recommended_action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(a.audit_metadata?.categories ?? a.audit_metadata?.hit_ids ?? []).join(", ") || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {alerts.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No security alerts.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redactions">
            <Card className="tech-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Highest severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redactedRows.map((r: any) => {
                      const sec = r.audit_metadata?.security ?? {};
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{r.task_category ?? "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{r.agent_id ? String(r.agent_id).slice(0, 8) : "—"}</TableCell>
                          <TableCell><Badge variant="outline">{r.status ?? "—"}</Badge></TableCell>
                          <TableCell className="text-xs">{(sec.finding_categories ?? []).join(", ") || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={sevColor(sec.highest_severity ?? "low")}>{sec.highest_severity ?? "—"}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                    {redactedRows.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No redactions captured yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspector">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="text-base">Test content before it touches the AI</CardTitle>
                <CardDescription>
                  Paste an email, document excerpt, scraped page or CRM note.
                  Liftor will classify sensitive data, redact secrets and detect prompt injection.
                  Nothing entered here is sent to any AI or saved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-1 space-y-1">
                    <label className="text-xs uppercase text-muted-foreground">Source</label>
                    <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. inbound_email" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs uppercase text-muted-foreground">Content</label>
                    <Textarea value={sample} onChange={(e) => setSample(e.target.value)} rows={6} placeholder="Paste untrusted external content here…" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSample("")}>Clear</Button>
                </div>
                {result && <InspectorOutput classify={result.classify} injection={result.injection} redacted={result.redact.redacted} layered={result.layered.prompt} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-base">Liftor security policies</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Policy title="What we redact before logging">
                  Passwords, API keys, OAuth/JWT tokens, AWS/Google/GitHub keys, PEM private keys, card and IBAN numbers, US SSN, UK NI, passport numbers and national IDs. Keys named <code>password</code>/<code>token</code>/<code>secret</code> are replaced wholesale.
                </Policy>
                <Policy title="Why we don't store full prompts">
                  Liftor stores summaries only. Full prompt and full output text are never persisted in <code>ai_usage_ledger</code>, <code>ai_quality_scores</code> or alerts. This bounds the blast radius of any database breach.
                </Policy>
                <Policy title="How prompt injection is handled">
                  External content is fenced as untrusted data inside the prompt. The trusted system layer instructs the AI to ignore instructions embedded in that data. When injection is detected, a security alert is raised and any connected external action is forced to founder approval.
                </Policy>
                <Policy title="Why external content cannot override Liftor rules">
                  Trust layers are explicit: trusted system &gt; founder-approved manuals &gt; internal cache &gt; untrusted external. Only the first two can change behaviour. Cached and external content are read-only context.
                </Policy>
                <Policy title="Safety">
                  No external action proceeds from content flagged as prompt-injection risk without founder approval, regardless of agent confidence or cost benefit.
                </Policy>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="tech-card">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Policy({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3 bg-muted/10">
      <div className="font-medium text-sm mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function InspectorOutput({ classify, injection, redacted, layered }: {
  classify: ClassifyResult; injection: InjectionResult; redacted: string | null; layered: string;
}) {
  return (
    <div className="space-y-3 mt-3">
      <div className="grid md:grid-cols-3 gap-2">
        <Card className="tech-card">
          <CardHeader className="pb-1"><CardTitle className="text-sm">Classification</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Secrets: <strong>{classify.has_secrets ? "yes" : "no"}</strong></div>
            <div>PII: <strong>{classify.has_pii ? "yes" : "no"}</strong></div>
            <div>Regulated: <strong>{classify.has_regulated_data ? "yes" : "no"}</strong></div>
            <div>Highest severity: <Badge variant="outline" className={sevColor(classify.highest_severity ?? "low")}>{classify.highest_severity ?? "—"}</Badge></div>
            <div className="text-muted-foreground">Categories: {Array.from(new Set(classify.findings.map((f) => f.category))).join(", ") || "—"}</div>
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-1"><CardTitle className="text-sm">Prompt injection</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Detected: <strong>{injection.detected ? "yes" : "no"}</strong></div>
            <div>Highest severity: <Badge variant="outline" className={sevColor(injection.highest_severity ?? "low")}>{injection.highest_severity ?? "—"}</Badge></div>
            <ul className="list-disc ml-4 text-muted-foreground">
              {injection.hits.map((h, i) => (<li key={i}><span className="font-mono">{h.id}</span> — {h.description}</li>))}
              {injection.hits.length === 0 && <li>No injection patterns detected.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-1"><CardTitle className="text-sm">Verdict</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>{injection.detected ? "Connected external action would be gated for founder approval." : "No injection — content treated as untrusted data only."}</div>
            {classify.has_secrets && <div className="text-red-400">Secret detected — alert would be raised.</div>}
            {classify.has_regulated_data && <div className="text-amber-400">Regulated topic — human review required.</div>}
          </CardContent>
        </Card>
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-1"><CardTitle className="text-sm">Redacted content</CardTitle></CardHeader>
        <CardContent className="text-xs"><pre className="whitespace-pre-wrap font-mono">{redacted ?? ""}</pre></CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-1"><CardTitle className="text-sm">Layered prompt that would be sent</CardTitle></CardHeader>
        <CardContent className="text-xs"><pre className="whitespace-pre-wrap font-mono">{layered}</pre></CardContent>
      </Card>
    </div>
  );
}