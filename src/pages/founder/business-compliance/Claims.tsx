import { useEffect, useState } from "react";
import { BCLayout, BCSection } from "./_shared";
import { fetchRules, type ComplianceRule } from "@/lib/businessComplianceEngine";

export default function BCClaims() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  useEffect(() => { fetchRules().then(setRules).catch(() => {}); }, []);
  const claims = rules.filter(r => r.rule_type === "claim" || r.rule_type === "marketing");
  return (
    <BCLayout title="Claims watchlist" subtitle="Regulated and risky-claim rules feeding the AI Gateway, Customer Sales, Social, Outreach and Voice agents. External content cannot override these rules.">
      <BCSection title="Active claim & marketing rules" description={`${claims.length} watched`}>
        {claims.length === 0 ? (
          <p className="text-xs text-muted-foreground">No claim rules yet.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {claims.map(r => (
              <li key={r.id} className="border border-border/50 rounded p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-medium text-sm">{r.rule_name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.business_id.slice(0,8)}</span>
                </div>
                <p className="text-muted-foreground mt-1">{r.rule_summary}</p>
                <p className="text-destructive mt-1">Prohibited: {r.prohibited_behavior}</p>
              </li>
            ))}
          </ul>
        )}
      </BCSection>
    </BCLayout>
  );
}