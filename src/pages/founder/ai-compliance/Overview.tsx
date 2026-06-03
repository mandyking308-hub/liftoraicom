import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AICLayout, AICSection, AICStat, SeverityBadge, EmptyState } from "./_shared";
import {
  fetchSystems, fetchFlows, fetchOversight, fetchEvidence, fetchGapActions,
  synthesizeGaps, summarizeCompliance, materialiseGaps,
  type AIComplianceSystem, type AIDataFlowRecord, type AIHumanOversightRecord,
  type AIComplianceEvidenceItem, type AIComplianceGapAction,
} from "@/lib/aiComplianceEngine";
import { fetchProfiles, fetchTriggers, type ComplianceProfile, type ApprovalTrigger } from "@/lib/businessComplianceEngine";
import { toast } from "sonner";

export default function AICOverview() {
  const [systems, setSystems] = useState<AIComplianceSystem[]>([]);
  const [flows, setFlows] = useState<AIDataFlowRecord[]>([]);
  const [oversight, setOversight] = useState<AIHumanOversightRecord[]>([]);
  const [evidence, setEvidence] = useState<AIComplianceEvidenceItem[]>([]);
  const [gaps, setGaps] = useState<AIComplianceGapAction[]>([]);
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [triggers, setTriggers] = useState<ApprovalTrigger[]>([]);

  const load = () => {
    fetchSystems().then(setSystems).catch(() => {});
    fetchFlows().then(setFlows).catch(() => {});
    fetchOversight().then(setOversight).catch(() => {});
    fetchEvidence().then(setEvidence).catch(() => {});
    fetchGapActions().then(setGaps).catch(() => {});
    fetchProfiles().then(setProfiles).catch(() => {});
    fetchTriggers().then(setTriggers).catch(() => {});
  };
  useEffect(load, []);

  const sum = useMemo(() => summarizeCompliance({ systems, flows, oversight, evidence, gaps }), [systems, flows, oversight, evidence, gaps]);
  const synth = useMemo(() => synthesizeGaps({ profiles, systems, flows, oversight, triggers }), [profiles, systems, flows, oversight, triggers]);

  const founderItems = [
    ...gaps.filter(g => (g.founder_decision_required || g.severity === "critical" || g.severity === "high") && g.status !== "done" && g.status !== "parked"),
    ...synth.filter(g => g.founder_decision_required || g.severity === "critical" || g.severity === "high")
      .map(g => ({ ...g, id: `synth:${g.gap_title}`, status: "open", created_at: "", updated_at: "" } as AIComplianceGapAction)),
  ];

  const onMaterialise = async () => {
    try {
      const count = await materialiseGaps(synth);
      toast.success(`Materialised ${count} gap action${count === 1 ? "" : "s"}.`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to materialise gaps");
    }
  };

  return (
    <AICLayout
      title="AI Compliance Control"
      subtitle="Evidence, oversight, data-flow, approval and risk controls for Liftor's AI-operated businesses."
      actions={
        <Button size="sm" variant="outline" onClick={onMaterialise} disabled={synth.length === 0}>
          Materialise {synth.length} synthesised gap{synth.length === 1 ? "" : "s"}
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AICStat label="AI systems inventoried" value={sum.systems} />
        <AICStat label="Critical / high risk" value={sum.critical_or_high} />
        <AICStat label="External-action capable" value={sum.external_action} />
        <AICStat label="Sensitive-data systems" value={sum.sensitive_data} />
        <AICStat label="Open compliance gaps" value={sum.open_gaps} />
        <AICStat label="Founder approvals logged" value={sum.founder_approvals} />
        <AICStat label="Evidence current" value={`${sum.evidence_current}/${sum.evidence_total}`} />
        <AICStat label="Next review due" value={sum.next_review_due_at ? new Date(sum.next_review_due_at).toLocaleDateString() : "—"} />
      </div>

      <AICSection title="What needs Mandy today"
        description="Founder-decision items only — high/critical severity or explicit approval gates. No generic compliance advice.">
        {founderItems.length === 0 ? (
          <EmptyState title="Nothing currently requires founder decision." hint="Synthesised gaps appear here automatically." />
        ) : (
          <ul className="text-xs space-y-2">
            {founderItems.slice(0, 20).map((g, i) => (
              <li key={g.id ?? i} className="flex items-start gap-2 border-b border-border/30 pb-2">
                <SeverityBadge level={g.severity} />
                <div className="flex-1">
                  <p className="font-medium">{g.gap_title}</p>
                  {g.gap_description && <p className="text-muted-foreground">{g.gap_description}</p>}
                  {g.required_action && <p className="text-[11px] text-primary mt-1">→ {g.required_action}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AICSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AICSection title="Cross-references" description="Existing modules this layer reads from.">
          <ul className="text-xs space-y-1">
            <li><Link to="/founder/business-compliance" className="text-primary hover:underline">Business Compliance Rules</Link> — risk profiles, rules, approval triggers</li>
            <li><Link to="/founder/approvals-ops" className="text-primary hover:underline">Approval Operations Centre</Link> — live approval log</li>
            <li><Link to="/founder/legal" className="text-primary hover:underline">Founder Legal Console</Link> — policy versions &amp; acceptances</li>
            <li><Link to="/founder/system-config/external-actions" className="text-primary hover:underline">External-action lock board</Link> — flags that gate live sends</li>
          </ul>
        </AICSection>
        <AICSection title="Wording boundary" description="Liftor never claims certified legal compliance.">
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>AI compliance <em>readiness</em>, not certification.</li>
            <li>Evidence-ready ≠ legally compliant. Adviser/legal review required for regulated decisions.</li>
            <li>External actions remain founder approval-gated.</li>
          </ul>
        </AICSection>
      </div>
    </AICLayout>
  );
}