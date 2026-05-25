import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MarketplaceVerification() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_verification_checks").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  const tone = (s: string) => s === "passed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : s === "failed" || s === "expired" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  return (
    <MPLayout title="Seller Verification" subtitle="Identity, business, insurance, licence, quality and references checks.">
      <MPSection title="Verification queue">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No verification checks yet" hint="Verification checks appear here as the agent runs them during onboarding." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(c => (
              <div key={c.id} className="rounded border border-border/40 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{c.check_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{c.check_summary ?? "—"}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${tone(c.check_status)}`}>{c.check_status}</Badge>
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}