import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  "customer_success_profiles","customer_onboarding_plans","customer_welcome_packs",
  "client_portal_blueprints","client_portal_content_packs","customer_bedding_in_reviews",
  "customer_success_checkins","customer_satisfaction_surveys","customer_quarterly_reports",
  "customer_renewal_reviews","customer_retention_risk_reviews","customer_upsell_opportunities",
  "customer_winback_plans","customer_success_manual_export_packs","customer_success_audit",
];

export default function CustomerSuccessDiagnosticsPanel() {
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const [placeholderStatus, setPlaceholderStatus] = useState<string>("…");
  const [acceptance, setAcceptance] = useState<any>(null);
  const refresh = async () => {
    const next: Record<string, number | string> = {};
    for (const t of TABLES) {
      try {
        const { count, error } = await (supabase as any).from(t).select("*", { count: "exact", head: true });
        next[t] = error ? `err` : (count ?? 0);
      } catch { next[t] = "err"; }
    }
    setCounts(next);
    try {
      const r = await fetch(`https://${(import.meta as any).env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/customer-success-external-action-placeholder`, { method: "POST" });
      setPlaceholderStatus(`${r.status} (${r.status === 403 ? "fail-closed OK" : "UNEXPECTED"})`);
    } catch { setPlaceholderStatus("network error"); }
  };
  const runAcceptance = async () => {
    const { data } = await supabase.functions.invoke("customer-success-portal-acceptance", { body: {} });
    setAcceptance(data);
  };
  const purge = async () => {
    const { data } = await supabase.functions.invoke("customer-success-rehearsal-purge", { body: { dry_run: false, confirmation: "PURGE CUSTOMER SUCCESS TEST DATA" } });
    setAcceptance(data);
  };
  useEffect(() => { refresh(); }, []);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Customer Success — Raw Diagnostics</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
          <Button size="sm" variant="outline" onClick={runAcceptance}>Acceptance</Button>
          <Button size="sm" variant="outline" onClick={purge}>Purge test data</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {TABLES.map(t => (
            <div key={t} className="p-2 rounded bg-secondary/40">
              <p className="text-[10px] text-muted-foreground truncate">{t}</p>
              <p className="font-semibold">{counts[t] ?? "…"}</p>
            </div>
          ))}
        </div>
        <p>External action placeholder: <span className="font-mono">{placeholderStatus}</span></p>
        {acceptance && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-72 overflow-auto">{JSON.stringify(acceptance, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}