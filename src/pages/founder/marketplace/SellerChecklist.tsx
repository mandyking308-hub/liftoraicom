import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Lock } from "lucide-react";

type Row = { id: string; seller_name?: string; onboarding_status?: string; missing?: string[]; terms?: boolean; payout?: string; listing?: string };

export default function SellerChecklist() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data: onboarding = [] } = await sb.from("seller_onboarding_records").select("*").order("created_at", { ascending: false });
      const { data: accounts = [] } = await sb.from("seller_accounts").select("id,seller_name,seller_prospect_id");
      const idx: Record<string, string> = {};
      (accounts ?? []).forEach((a: any) => { if (a.seller_prospect_id) idx[a.seller_prospect_id] = a.seller_name; });
      setRows((onboarding ?? []).map((o: any) => ({
        id: o.id,
        seller_name: o.seller_prospect_id ? idx[o.seller_prospect_id] ?? "Prospect" : "Prospect",
        onboarding_status: o.onboarding_status,
        missing: o.missing_information ?? [],
        terms: o.terms_accepted,
        payout: o.payout_setup_status,
        listing: o.listing_setup_status,
      })));
    })();
  }, []);

  const Item = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className="inline-flex items-center gap-1 text-[11px]">
      {ok ? <Check size={11} className="text-emerald-400" /> : <X size={11} className="text-yellow-400" />} {label}
    </span>
  );

  return (
    <MPLayout title="Seller Onboarding Checklist" subtitle="Live internal checklist. Activation, terms send and payout setup require approval.">
      <MPSection title="Per-seller checklist">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No onboarding in progress" hint="Checklists appear here as prospects move into onboarding." /> : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="rounded border border-border/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.seller_name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{r.onboarding_status}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Item ok={!!r.terms} label="Terms accepted" />
                  <Item ok={r.payout === "verified"} label={`Payout ${r.payout}`} />
                  <Item ok={r.listing === "published" || r.listing === "approved" || r.listing === "draft"} label={`Listing ${r.listing}`} />
                  <Item ok={(r.missing ?? []).length === 0} label={(r.missing ?? []).length === 0 ? "No missing info" : `Missing: ${(r.missing ?? []).join(", ")}`} />
                </div>
                <p className="text-[10px] text-yellow-400 inline-flex items-center gap-1"><Lock size={9}/> Activation, terms send and payout activation require founder approval.</p>
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}