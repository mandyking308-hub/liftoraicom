import { useEffect, useState } from "react";
import { PRLayout, PRSection, PREmpty, PR_RISK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PrivacyProcessors() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("processor_register").select("*").order("processor_name").limit(300)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  return (
    <PRLayout title="Processor register" subtitle="Every third party that processes personal data on Liftor's or a client's behalf. Each must have a DPA in place. Processors without one are flagged.">
      <PRSection title="Processors">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PREmpty title="No processors recorded" hint="Add every vendor or sub-processor that touches personal data — CRM, email, voice, AI, analytics, hosting." />
          : (
            <div className="space-y-2">
              {rows.map((p) => {
                const dpaMissing = !["in_place", "signed"].includes(p.dpa_status);
                return (
                  <div key={p.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.processor_name}</span>
                      <Badge variant="outline" className={PR_RISK_TONE[p.risk_level] || ""}>{p.risk_level} risk</Badge>
                      {dpaMissing
                        ? <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">DPA: {p.dpa_status}</Badge>
                        : <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">DPA {p.dpa_status}</Badge>}
                      <Badge variant="outline">review: {p.review_status}</Badge>
                    </div>
                    {p.data_processed && <p className="text-muted-foreground">Data: {p.data_processed}</p>}
                  </div>
                );
              })}
            </div>
          )}
      </PRSection>
    </PRLayout>
  );
}