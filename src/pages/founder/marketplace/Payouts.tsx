import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty, NoExternalActionBanner } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

const tone: Record<string, string> = {
  verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  not_started: "bg-muted text-muted-foreground border-border/60",
};

export default function Payouts() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_payout_profiles").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Payout Setup" subtitle="Payout providers, schedules, commission and fees. Activation and changes require approval.">
      <NoExternalActionBanner />
      <MPSection title="Payout profiles">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No payout profiles yet" hint="Profiles appear as sellers reach the payout setup stage. Activation is approval-gated." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(p => (
              <div key={p.id} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">{p.payout_provider.replace(/_/g, " ")}</span>
                  <div className="flex gap-2 items-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400"><Lock size={9}/> approval to activate</span>
                    <Badge variant="outline" className={`text-[10px] ${tone[p.payout_status] ?? ""}`}>{p.payout_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.currency} · {p.payout_schedule} · commission {Number(p.commission_rate ?? 0)}% · platform fee {Number(p.platform_fee ?? 0)} · tax form {p.tax_form_status}
                </p>
                {Array.isArray(p.payout_risk_flags) && p.payout_risk_flags.length > 0 && (
                  <p className="text-xs text-yellow-400">Risk: {p.payout_risk_flags.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}