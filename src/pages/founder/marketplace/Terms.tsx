import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function Terms() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_terms_acceptance").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Terms Acceptance" subtitle="Versioned terms acceptance log. Sending terms to sellers requires approval.">
      <MPSection title="Acceptance log">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No acceptance records yet" hint="Once sellers accept terms in onboarding, entries appear here for audit." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(t => (
              <div key={t.id} className="rounded border border-border/40 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">Version {t.terms_version}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {t.acceptance_source ?? "—"} · IP: {t.ip_address_summary ?? "—"} · {t.accepted_at ? new Date(t.accepted_at).toLocaleString() : "not accepted"}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${t.accepted ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
                  {t.accepted ? "accepted" : "pending"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}