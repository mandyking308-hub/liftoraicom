import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COLayout, COSection, COEmpty } from "./_shared";

export default function CustomerOnboardingMissingInfo() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("onboarding_records").select("*").limit(300)
      .then(r => {
        const list = (r.data || []).filter((x: any) => Array.isArray(x.missing_information) && x.missing_information.length > 0);
        setRows(list);
        setLoading(false);
      });
  }, []);

  return (
    <COLayout title="Missing information" subtitle="Customers currently blocking onboarding because something is missing. Chase messages are drafted internally and require founder approval before send.">
      <COSection title={`Customers waiting (${rows.length})`}>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <COEmpty title="No customers waiting on missing information" /> :
          <ul className="text-xs space-y-2">
            {rows.map(r => (
              <li key={r.id} className="border border-border/40 rounded p-2 space-y-1">
                <p className="font-mono">{r.id.slice(0, 8)} · {r.onboarding_status} {r.onboarding_stage ? `· ${r.onboarding_stage}` : ""}</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {(r.missing_information as any[]).map((m, idx) => (
                    <li key={idx}>{typeof m === "string" ? m : m?.label || JSON.stringify(m)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        }
      </COSection>
    </COLayout>
  );
}