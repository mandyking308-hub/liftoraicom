import { useEffect, useState } from "react";
import { BCLayout, BCSection } from "./_shared";
import { fetchRules, type ComplianceRule } from "@/lib/businessComplianceEngine";

export default function BCChannels() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  useEffect(() => { fetchRules().then(setRules).catch(() => {}); }, []);
  const channels = rules.filter(r => ["channel","recording","privacy","customer_type","jurisdiction","refund","pricing"].includes(r.rule_type));
  return (
    <BCLayout title="Channel restrictions" subtitle="How each channel (voice, email, social, marketplace, web) is restricted per business. Feeds Outreach, Voice, Social, Customer Sales.">
      <BCSection title="Channel & access rules" description={`${channels.length} restrictions`}>
        {channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channel restrictions yet.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {channels.map(r => (
              <li key={r.id} className="border border-border/50 rounded p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-medium text-sm">{r.rule_name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.rule_type}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.business_id.slice(0,8)}</span>
                </div>
                <p className="text-muted-foreground mt-1">{r.rule_summary}</p>
              </li>
            ))}
          </ul>
        )}
      </BCSection>
    </BCLayout>
  );
}