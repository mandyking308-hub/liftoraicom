import { useEffect, useState } from "react";
import { FundingRadarLayout, FRSection, NeedsVerification } from "./_shared";
import { fetchClusters } from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const empty = { cluster_name: "", problem_thesis: "", customer_pain: "", buyer_type: "", market_validation_summary: "", capital_efficiency_rationale: "", distinct_execution_route: "", notes: "" };

export default function FRClusters() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(empty);
  const reload = () => fetchClusters().then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!draft.cluster_name.trim()) { toast.error("Cluster name required"); return; }
    const { error } = await (supabase as any).from("funding_problem_clusters").insert({
      ...draft,
      needs_verification: !draft.market_validation_summary || !draft.distinct_execution_route,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Cluster added");
    setDraft(empty);
    setOpen(false);
    reload();
  };

  return (
    <FundingRadarLayout title="Problem clusters" subtitle="Group funded companies into shared problem clusters with a distinct execution route.">
      <FRSection
        title={`Clusters (${rows.length})`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add cluster</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New problem cluster</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">Cluster name *</Label><Input value={draft.cluster_name} onChange={(e) => setDraft({ ...draft, cluster_name: e.target.value })} /></div>
                <div><Label className="text-xs">Buyer type</Label><Input value={draft.buyer_type} onChange={(e) => setDraft({ ...draft, buyer_type: e.target.value })} /></div>
                <div><Label className="text-xs">Problem thesis</Label><Textarea rows={2} value={draft.problem_thesis} onChange={(e) => setDraft({ ...draft, problem_thesis: e.target.value })} /></div>
                <div><Label className="text-xs">Customer pain</Label><Textarea rows={2} value={draft.customer_pain} onChange={(e) => setDraft({ ...draft, customer_pain: e.target.value })} /></div>
                <div><Label className="text-xs">Market validation summary</Label><Textarea rows={2} value={draft.market_validation_summary} onChange={(e) => setDraft({ ...draft, market_validation_summary: e.target.value })} /></div>
                <div><Label className="text-xs">Capital efficiency rationale</Label><Textarea rows={2} value={draft.capital_efficiency_rationale} onChange={(e) => setDraft({ ...draft, capital_efficiency_rationale: e.target.value })} /></div>
                <div><Label className="text-xs">Distinct execution route (legally clean)</Label><Textarea rows={2} value={draft.distinct_execution_route} onChange={(e) => setDraft({ ...draft, distinct_execution_route: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No clusters yet.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{r.cluster_name}</p>
                  <span className={"text-[10px] " + (r.needs_verification ? "text-amber-400" : "text-emerald-400")}>{r.needs_verification ? "Needs verification" : "Verified"}</span>
                </div>
                <p className="text-xs text-muted-foreground">Buyer: <NeedsVerification value={r.buyer_type} /></p>
                <p className="text-xs"><span className="text-muted-foreground">Thesis: </span><NeedsVerification value={r.problem_thesis} /></p>
                <p className="text-xs"><span className="text-muted-foreground">Distinct route: </span><NeedsVerification value={r.distinct_execution_route} /></p>
              </div>
            ))}
          </div>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}