import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PCLayout, PCSection, ClaimStatusBadge } from "./_shared";
import {
  fetchClaims, updateClaimStatus, type Claim, type ClaimStatus,
} from "@/lib/productCatalogueEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FILTERS: Array<ClaimStatus | "all"> = ["draft", "approved", "prohibited", "retired", "all"];

export default function PCClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<ClaimStatus | "all">("draft");
  const load = () => fetchClaims().then(setClaims).catch(() => {});
  useEffect(() => { load(); }, []);
  const filtered = filter === "all" ? claims : claims.filter(c => c.claim_status === filter);

  const setStatus = async (id: string, s: ClaimStatus) => {
    let approverId: string | undefined;
    if (s === "approved") {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { toast.error("Not signed in"); return; }
      approverId = data.user.id;
    }
    try { await updateClaimStatus(id, s, approverId); toast.success(`Claim ${s}.`); load(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  };

  return (
    <PCLayout title="Claims approval" subtitle="Approve, prohibit or retire product/offer claims. Sales and Voice cannot use draft or prohibited claims.">
      <PCSection title="Filters">
        <div className="flex gap-1 flex-wrap text-xs">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded border ${filter === f ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 hover:bg-secondary text-muted-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </PCSection>
      <PCSection title={`Claims (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No claims.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map(c => (
              <li key={c.id} className="border border-border/50 rounded p-3 text-xs space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <ClaimStatusBadge status={c.claim_status} />
                  <span className="text-muted-foreground font-mono">{c.business_id.slice(0, 8)}</span>
                  {c.approved_at && <span className="ml-auto text-[10px] text-emerald-400">Approved {new Date(c.approved_at).toLocaleDateString()}</span>}
                </div>
                <p>{c.claim_text}</p>
                {c.evidence_source && <p className="text-muted-foreground">Evidence: {c.evidence_source}</p>}
                <div className="flex gap-1 flex-wrap pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={c.claim_status === "approved"} onClick={() => setStatus(c.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={c.claim_status === "prohibited"} onClick={() => setStatus(c.id, "prohibited")}>Prohibit</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={c.claim_status === "retired"} onClick={() => setStatus(c.id, "retired")}>Retire</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PCSection>
    </PCLayout>
  );
}