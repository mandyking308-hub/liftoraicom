import { Component, ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import {
  fetchSystems, fetchFlows, fetchOversight, fetchEvidence, fetchGapActions,
  aggregateCommandCentre, type CommandCentreSummary,
} from "@/lib/aiComplianceEngine";
import { fetchProfiles, fetchTriggers } from "@/lib/businessComplianceEngine";

const STATUS_BADGE: Record<CommandCentreSummary["status"], { label: string; cls: string }> = {
  clear: { label: "Clear", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  needs_review: { label: "Needs review", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  blocked: { label: "Blocked", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const SEV_CLS: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border/50",
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

class AICErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[AIComplianceControlPanel]", error);
  }
  render() {
    if (this.state.error) return <AICFallback message={this.state.error.message} />;
    return this.props.children;
  }
}

function AICFallback({ message }: { message?: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card">
        <CardContent className="p-4 text-xs space-y-2">
          <p className="font-medium">
            <ShieldCheck size={12} className="inline mr-1 text-primary" />
            AI Compliance Control could not load yet — open AI Compliance Control directly or run module scan.
          </p>
          {message && <p className="text-[10px] text-muted-foreground">Detail: {message}</p>}
          <Link to="/founder/ai-compliance" className="text-primary hover:underline inline-flex items-center gap-1">
            Open AI Compliance Control <ArrowRight size={11} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AIComplianceControlPanel() {
  return (
    <AICErrorBoundary>
      <AIComplianceControlPanelInner />
    </AICErrorBoundary>
  );
}

function AIComplianceControlPanelInner() {
  const [summary, setSummary] = useState<CommandCentreSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
      Promise.resolve(p).then(r => r ?? fallback, () => fallback);
    (async () => {
      try {
        const [systems, flows, oversight, evidence, gaps, profiles, triggers] = await Promise.all([
          safe(fetchSystems(), []),
          safe(fetchFlows(), []),
          safe(fetchOversight(), []),
          safe(fetchEvidence(), []),
          safe(fetchGapActions(), []),
          safe(fetchProfiles(), []),
          safe(fetchTriggers(), []),
        ]);
        if (!active) return;
        setSummary(aggregateCommandCentre({ systems, flows, oversight, evidence, gaps, profiles, triggers }));
      } catch (e: any) {
        if (active) setErr(e?.message ?? "Failed to load AI compliance summary.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (err && !summary) return <AICFallback message={err} />;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              AI Compliance Control
              {summary && (
                <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[summary.status].cls}`}>
                  {STATUS_BADGE[summary.status].label}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Evidence-ready snapshot of AI systems, oversight and approval gates. Readiness only — not legal advice.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/founder/ai-compliance" className="inline-flex items-center gap-1">
              Open <ArrowRight size={12} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-xs text-muted-foreground">Loading AI compliance state…</p>}
          {summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="AI systems inventoried" value={summary.systems} />
                <Stat label="High / critical risk" value={summary.critical_or_high} />
                <Stat label="External-action capable" value={summary.external_action} />
                <Stat label="Sensitive-data systems" value={summary.sensitive_data} />
                <Stat label="Materialised gaps" value={summary.materialised_gaps} />
                <Stat label="Computed review items" value={summary.computed_review_items} />
                <Stat label="Founder decisions required" value={summary.founder_decisions_required} tone={summary.founder_decisions_required > 0 ? "destructive" : undefined} />
                <Stat label="Blocking issues" value={summary.blocking_issues} tone={summary.blocking_issues > 0 ? "destructive" : undefined} />
                <Stat
                  label="Next review due"
                  value={summary.next_review_due_at ? new Date(summary.next_review_due_at).toLocaleDateString() : "—"}
                />
              </div>

              {summary.blocking_reasons.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                    <AlertTriangle size={12} /> Blocking issues
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {summary.blocking_reasons.slice(0, 5).map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top 3 — what needs Mandy today</p>
                  <Link to="/founder/ai-compliance" className="text-[11px] text-primary hover:underline">Open Guided Compliance Setup →</Link>
                </div>
                {summary.top_items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No AI compliance decisions require founder attention right now.</p>
                ) : (
                  <ul className="text-xs space-y-1.5">
                    {summary.top_items.map((it, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 rounded border border-border/50 px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{it.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            source: {it.source ?? "—"}{it.due_date ? ` · due ${new Date(it.due_date).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${SEV_CLS[it.severity] ?? "border-border/50"}`}>
                          {it.severity}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {summary.founder_decisions_required > summary.top_items.length && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    +{summary.founder_decisions_required - summary.top_items.length} more — use <Link to="/founder/ai-compliance" className="text-primary hover:underline">Guided Compliance Setup</Link> instead of processing one by one.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "destructive" }) {
  return (
    <div className={`rounded border p-2 ${tone === "destructive" ? "border-destructive/40 bg-destructive/5" : "border-border/50 bg-background/40"}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}