import { useEffect, useState } from "react";
import { PRLayout, PRSection, PREmpty, PR_CONSENT_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PrivacyConsent() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("consent_records").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  return (
    <PRLayout title="Consent records" subtitle="Marketing, recording, profiling, terms, privacy policy and cookies consent per contact. The Privacy Agent checks marketing/calling consent before any outbound action is queued.">
      <PRSection title="Records">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PREmpty title="No consent records yet" hint="Record consent at the point of capture (form, call recording opt-in, terms acceptance)." />
          : (
            <div className="space-y-2">
              {rows.map((c) => (
                <div key={c.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{c.consent_type}</Badge>
                    <Badge variant="outline" className={PR_CONSENT_TONE[c.consent_status] || ""}>{c.consent_status}</Badge>
                    {c.consent_source && <Badge variant="outline">{c.consent_source}</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {c.consented_at ? `Consented ${new Date(c.consented_at).toLocaleDateString()}` : "No consent timestamp"}
                    {c.withdrawn_at ? ` · Withdrawn ${new Date(c.withdrawn_at).toLocaleDateString()}` : ""}
                  </p>
                  {c.consent_text && <p className="text-muted-foreground italic">"{c.consent_text}"</p>}
                </div>
              ))}
            </div>
          )}
      </PRSection>
    </PRLayout>
  );
}