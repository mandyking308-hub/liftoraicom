import { useEffect, useMemo, useState } from "react";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import { fetchWhiteSpaceOpportunities, fetchMarketMaps, fetchClusters, WHITE_SPACE_SIGNALS } from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

const RECOMMENDED_STATUSES = ["build","watch","avoid","partner","managed_service_first"] as const;

const empty = {
  market_map_id: "",
  cluster_id: "",
  opportunity_name: "",
  underserved_customer_segment: "",
  underserved_geography: "",
  underserved_vertical: "",
  customer_pain_gap: "",
  incumbent_weakness: "",
  why_existing_players_are_not_solving_it: "",
  liftor_legally_distinct_angle: "",
  ai_advantage: "",
  low_capex_entry_route: "",
  recurring_revenue_logic: "",
  distribution_route: "",
  marketplace_consideration: "",
  legal_ip_risk: "",
  compliance_risk: "",
  recommended_status: "build" as typeof RECOMMENDED_STATUSES[number],
  founder_notes: "",
};

export default function FRWhiteSpace() {
  const [rows, setRows] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<typeof empty>(empty);

  const reload = () => {
    fetchWhiteSpaceOpportunities().then(setRows).catch(() => setRows([]));
    fetchMarketMaps().then(setMaps).catch(() => setMaps([]));
    fetchClusters().then(setClusters).catch(() => setClusters([]));
  };
  useEffect(() => { reload(); }, []);

  const totals = useMemo(() => ({
    total: rows.length,
    build: rows.filter((r) => r.recommended_status === "build").length,
    watch: rows.filter((r) => r.recommended_status === "watch").length,
    avoid: rows.filter((r) => r.recommended_status === "avoid").length,
    managed: rows.filter((r) => r.recommended_status === "managed_service_first").length,
  }), [rows]);

  const save = async () => {
    if (!draft.opportunity_name.trim()) { toast.error("Opportunity name required"); return; }
    const payload: any = {
      ...draft,
      market_map_id: draft.market_map_id || null,
      cluster_id: draft.cluster_id || null,
    };
    const { error } = await (supabase as any).from("funding_white_space_opportunities").insert(payload);
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from("ma_audit_logs").insert({
      action_type: "funding_radar.white_space.added",
      table_name: "funding_white_space_opportunities",
      new_value: { name: draft.opportunity_name, status: draft.recommended_status },
    });
    toast.success("White space opportunity added");
    setDraft(empty); setOpen(false); reload();
  };

  return (
    <FundingRadarLayout
      title="White Space"
      subtitle="Underserved niches, geographies and vertical wedges where Liftor can enter safely with AI + capital efficiency."
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FRStat label="Opportunities" value={totals.total} />
        <FRStat label="Build" value={totals.build} />
        <FRStat label="Watch" value={totals.watch} />
        <FRStat label="Managed first" value={totals.managed} />
        <FRStat label="Avoid" value={totals.avoid} />
      </div>

      <FRSection
        title={`White space opportunities (${rows.length})`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add opportunity</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New white space opportunity</DialogTitle></DialogHeader>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Opportunity name *</Label><Input value={draft.opportunity_name} onChange={(e) => setDraft({ ...draft, opportunity_name: e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Recommended status</Label>
                    <Select value={draft.recommended_status} onValueChange={(v) => setDraft({ ...draft, recommended_status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECOMMENDED_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Market map</Label>
                    <Select value={draft.market_map_id} onValueChange={(v) => setDraft({ ...draft, market_map_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                      <SelectContent>
                        {maps.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.market_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cluster</Label>
                    <Select value={draft.cluster_id} onValueChange={(v) => setDraft({ ...draft, cluster_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                      <SelectContent>
                        {clusters.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.cluster_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Underserved customer segment</Label><Input value={draft.underserved_customer_segment} onChange={(e) => setDraft({ ...draft, underserved_customer_segment: e.target.value })} /></div>
                  <div><Label className="text-xs">Underserved geography</Label><Input value={draft.underserved_geography} onChange={(e) => setDraft({ ...draft, underserved_geography: e.target.value })} /></div>
                  <div><Label className="text-xs">Underserved vertical</Label><Input value={draft.underserved_vertical} onChange={(e) => setDraft({ ...draft, underserved_vertical: e.target.value })} /></div>
                </div>
                {([
                  ["customer_pain_gap","Customer pain gap"],
                  ["incumbent_weakness","Incumbent weakness"],
                  ["why_existing_players_are_not_solving_it","Why existing players aren't solving it"],
                  ["liftor_legally_distinct_angle","Liftor's legally distinct angle"],
                  ["ai_advantage","AI advantage"],
                  ["low_capex_entry_route","Low-capex entry route"],
                  ["recurring_revenue_logic","Recurring revenue logic"],
                  ["distribution_route","Distribution route"],
                  ["marketplace_consideration","Marketplace consideration"],
                  ["legal_ip_risk","Legal/IP risk"],
                  ["compliance_risk","Compliance risk"],
                  ["founder_notes","Founder notes"],
                ] as const).map(([k, label]) => (
                  <div key={k}><Label className="text-xs">{label}</Label><Textarea rows={2} value={(draft as any)[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value } as any)} /></div>
                ))}
              </div>
              <DialogFooter><Button onClick={save}>Save opportunity</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No white space opportunities recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />{r.opportunity_name}</p>
                  <Badge variant="outline" className="text-[10px]">{r.recommended_status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.funding_market_maps?.market_name ?? "—"} · {r.funding_problem_clusters?.cluster_name ?? ""}</p>
                {r.underserved_vertical && <p className="text-xs"><span className="text-muted-foreground">Vertical: </span>{r.underserved_vertical}</p>}
                {r.underserved_geography && <p className="text-xs"><span className="text-muted-foreground">Geography: </span>{r.underserved_geography}</p>}
                {r.liftor_legally_distinct_angle && <p className="text-xs"><span className="text-muted-foreground">Distinct angle: </span>{r.liftor_legally_distinct_angle}</p>}
                {r.ai_advantage && <p className="text-xs"><span className="text-muted-foreground">AI advantage: </span>{r.ai_advantage}</p>}
              </div>
            ))}
          </div>
        )}
      </FRSection>

      <FRSection title="White space signals tracked" description="Reference checklist — note observations against each opportunity.">
        <div className="flex flex-wrap gap-1">
          {WHITE_SPACE_SIGNALS.map((s) => (<Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>))}
        </div>
      </FRSection>
    </FundingRadarLayout>
  );
}