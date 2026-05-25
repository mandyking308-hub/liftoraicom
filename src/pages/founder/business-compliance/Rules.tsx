import { useEffect, useMemo, useState } from "react";
import { BCLayout, BCSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchRules, type ComplianceRule } from "@/lib/businessComplianceEngine";

export default function BCRules() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  useEffect(() => { fetchRules().then(setRules).catch(() => {}); }, []);
  const grouped = useMemo(() => {
    const m: Record<string, ComplianceRule[]> = {};
    for (const r of rules) (m[r.rule_type] ||= []).push(r);
    return m;
  }, [rules]);
  return (
    <BCLayout title="Rule library" subtitle="All active compliance rules across businesses, grouped by rule type. Edits live; external publication of changes remains approval-gated.">
      {Object.keys(grouped).length === 0 && (
        <BCSection title="No rules yet"><p className="text-xs text-muted-foreground">Seed standard rules from the By business page.</p></BCSection>
      )}
      {Object.entries(grouped).map(([type, list]) => (
        <BCSection key={type} title={type} description={`${list.length} rule${list.length === 1 ? "" : "s"}`}>
          <div className="space-y-2">
            {list.map(r => (
              <div key={r.id} className="border border-border/50 rounded p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{r.rule_name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.business_id.slice(0,8)}</span>
                  {r.approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval</Badge>}
                  {r.adviser_review_required && <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">adviser review</Badge>}
                  {!r.active && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                </div>
                {r.rule_summary && <p className="text-muted-foreground">{r.rule_summary}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-emerald-400">Allowed:</span> {r.allowed_behavior ?? "—"}</div>
                  <div><span className="text-destructive">Prohibited:</span> {r.prohibited_behavior ?? "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </BCSection>
      ))}
    </BCLayout>
  );
}