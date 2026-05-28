import { useEffect, useMemo, useState } from "react";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import {
  fetchMarketMaps,
  fetchClusters,
  MARKET_STAGES,
  CROWDING_LEVELS,
  SATURATION_LEVELS,
  ENTRY_STRATEGIES,
  type MarketStage,
  ENTRY_STRATEGY_LABEL,
  CROWDED_MARKET_SIGNALS,
  recommendEntryStrategy,
  computeLiftorEntryScore,
  deriveCrowdingLevel,
  deriveSaturationRisk,
  type EntryStrategy,
} from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Map as MapIcon, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const empty = {
  cluster_id: "" as string | null,
  market_name: "",
  market_description: "",
  sector: "",
  geography: "",
  customer_segment: "",
  number_of_known_competitors: 0,
  number_of_funded_companies: 0,
  total_visible_funding: "",
  market_stage: "growing" as MarketStage,
  white_space_score: 50,
  fragmentation_score: 50,
  buyer_education_score: 50,
  switching_difficulty_score: 50,
  distribution_difficulty_score: 50,
  pricing_pressure_score: 50,
  ai_disruption_potential_score: 60,
  founder_notes: "",
  recommended_entry_strategy: "" as EntryStrategy | "",
  avoid_reason: "",
};

export default function FRMarketMaps() {
  const [rows, setRows] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<typeof empty>(empty);

  const reload = () => {
    fetchMarketMaps().then(setRows).catch(() => setRows([]));
    fetchClusters().then(setClusters).catch(() => setClusters([]));
  };
  useEffect(() => { reload(); }, []);

  const preview = useMemo(() => {
    const rec = recommendEntryStrategy({
      ...draft,
      number_of_funded_companies: Number(draft.number_of_funded_companies) || 0,
      number_of_known_competitors: Number(draft.number_of_known_competitors) || 0,
      dominant_players: [],
    });
    const entry = computeLiftorEntryScore({
      ...draft,
      number_of_funded_companies: Number(draft.number_of_funded_companies) || 0,
      number_of_known_competitors: Number(draft.number_of_known_competitors) || 0,
    });
    const crowding = deriveCrowdingLevel({
      number_of_funded_companies: Number(draft.number_of_funded_companies) || 0,
      number_of_known_competitors: Number(draft.number_of_known_competitors) || 0,
    });
    const saturation = deriveSaturationRisk({ ...draft, dominant_players: [] });
    return { rec, entry, crowding, saturation };
  }, [draft]);

  const save = async () => {
    if (!draft.market_name.trim()) { toast.error("Market name required"); return; }
    const payload: any = {
      ...draft,
      cluster_id: draft.cluster_id || null,
      total_visible_funding: draft.total_visible_funding ? Number(draft.total_visible_funding) : null,
      crowding_level: preview.crowding,
      saturation_risk: preview.saturation,
      liftor_entry_score: preview.entry,
      recommended_entry_strategy: draft.recommended_entry_strategy || preview.rec.strategy,
      avoid_reason: draft.avoid_reason || preview.rec.reason,
    };
    const { error } = await (supabase as any).from("funding_market_maps").insert(payload);
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from("ma_audit_logs").insert({
      action_type: "funding_radar.market_map.added", table_name: "funding_market_maps", new_value: { market_name: draft.market_name },
    });
    toast.success("Market map added");
    setDraft(empty); setOpen(false); reload();
  };

  const totals = useMemo(() => ({
    total: rows.length,
    avoid: rows.filter((r) => r.recommended_entry_strategy?.startsWith("AVOID")).length,
    build: rows.filter((r) => r.recommended_entry_strategy?.startsWith("BUILD")).length,
    watch: rows.filter((r) => r.recommended_entry_strategy?.startsWith("WATCH")).length,
    avgWhiteSpace: rows.length ? Math.round(rows.reduce((a, r) => a + Number(r.white_space_score ?? 0), 0) / rows.length) : 0,
  }), [rows]);

  return (
    <FundingRadarLayout
      title="Market Maps"
      subtitle="Crowding, saturation and white space analysis per market. Crowded does not mean bad — proven markets with white space are often the best wedges."
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FRStat label="Markets mapped" value={totals.total} />
        <FRStat label="Avoid" value={totals.avoid} />
        <FRStat label="Build" value={totals.build} />
        <FRStat label="Watch" value={totals.watch} />
        <FRStat label="Avg white space" value={`${totals.avgWhiteSpace}/100`} />
      </div>

      <FRSection
        title={`Markets (${rows.length})`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add market map</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New market map</DialogTitle></DialogHeader>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Market name *</Label><Input value={draft.market_name} onChange={(e) => setDraft({ ...draft, market_name: e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Cluster</Label>
                    <Select value={draft.cluster_id ?? ""} onValueChange={(v) => setDraft({ ...draft, cluster_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional cluster..." /></SelectTrigger>
                      <SelectContent>
                        {clusters.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.cluster_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Sector</Label><Input value={draft.sector} onChange={(e) => setDraft({ ...draft, sector: e.target.value })} /></div>
                  <div><Label className="text-xs">Geography</Label><Input value={draft.geography} onChange={(e) => setDraft({ ...draft, geography: e.target.value })} /></div>
                  <div><Label className="text-xs">Customer segment</Label><Input value={draft.customer_segment} onChange={(e) => setDraft({ ...draft, customer_segment: e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Market stage</Label>
                    <Select value={draft.market_stage} onValueChange={(v) => setDraft({ ...draft, market_stage: v as MarketStage })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MARKET_STAGES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-xs">Description</Label><Textarea rows={2} value={draft.market_description} onChange={(e) => setDraft({ ...draft, market_description: e.target.value })} /></div>

                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Known competitors</Label><Input type="number" value={draft.number_of_known_competitors} onChange={(e) => setDraft({ ...draft, number_of_known_competitors: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Funded companies</Label><Input type="number" value={draft.number_of_funded_companies} onChange={(e) => setDraft({ ...draft, number_of_funded_companies: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Total visible funding (USD)</Label><Input type="number" value={draft.total_visible_funding} onChange={(e) => setDraft({ ...draft, total_visible_funding: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {([
                    ["white_space_score", "White space"],
                    ["fragmentation_score", "Fragmentation"],
                    ["buyer_education_score", "Buyer education"],
                    ["switching_difficulty_score", "Switching difficulty"],
                    ["distribution_difficulty_score", "Distribution difficulty"],
                    ["pricing_pressure_score", "Pricing pressure"],
                    ["ai_disruption_potential_score", "AI disruption potential"],
                  ] as const).map(([k, label]) => (
                    <div key={k}>
                      <Label className="text-xs">{label} (0–100)</Label>
                      <Input type="number" min={0} max={100} value={(draft as any)[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) } as any)} />
                    </div>
                  ))}
                </div>

                <div className="border border-border/50 rounded p-2 space-y-1">
                  <p className="text-[11px] text-muted-foreground">Auto-derived</p>
                  <p>Crowding: <Badge variant="outline" className="text-[10px]">{preview.crowding}</Badge> · Saturation: <Badge variant="outline" className="text-[10px]">{preview.saturation}</Badge> · Liftor entry: <span className="text-primary font-bold">{preview.entry}/100</span></p>
                  <p>Recommended: <Badge variant="outline" className="text-[10px]">{ENTRY_STRATEGY_LABEL[preview.rec.strategy]}</Badge></p>
                  <p className="text-muted-foreground">{preview.rec.reason}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs">Override recommended strategy (optional)</Label>
                    <Select value={draft.recommended_entry_strategy} onValueChange={(v) => setDraft({ ...draft, recommended_entry_strategy: v as EntryStrategy })}>
                      <SelectTrigger><SelectValue placeholder="Use auto-recommendation" /></SelectTrigger>
                      <SelectContent>
                        {ENTRY_STRATEGIES.map((s) => (<SelectItem key={s} value={s}>{ENTRY_STRATEGY_LABEL[s]}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Avoid reason / wedge note</Label><Textarea rows={2} value={draft.avoid_reason} onChange={(e) => setDraft({ ...draft, avoid_reason: e.target.value })} /></div>
                  <div><Label className="text-xs">Founder notes</Label><Textarea rows={2} value={draft.founder_notes} onChange={(e) => setDraft({ ...draft, founder_notes: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Save market map</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No markets mapped yet. Add one to start the crowding & white-space analysis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2 pr-2">Market</th>
                  <th className="py-2 pr-2">Cluster</th>
                  <th className="py-2 pr-2">Stage</th>
                  <th className="py-2 pr-2">Crowding</th>
                  <th className="py-2 pr-2">Saturation</th>
                  <th className="py-2 pr-2">White space</th>
                  <th className="py-2 pr-2">Funded</th>
                  <th className="py-2 pr-2">Entry score</th>
                  <th className="py-2 pr-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/30">
                    <td className="py-2 pr-2"><span className="inline-flex items-center gap-1"><MapIcon className="h-3 w-3 text-primary" />{r.market_name}</span></td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.funding_problem_clusters?.cluster_name ?? "—"}</td>
                    <td className="py-2 pr-2">{r.market_stage ?? "—"}</td>
                    <td className="py-2 pr-2">{r.crowding_level ?? "—"}</td>
                    <td className="py-2 pr-2">{r.saturation_risk ?? "—"}</td>
                    <td className="py-2 pr-2">{r.white_space_score ?? "—"}</td>
                    <td className="py-2 pr-2">{r.number_of_funded_companies ?? 0}</td>
                    <td className="py-2 pr-2 font-bold text-primary">{r.liftor_entry_score ?? "—"}</td>
                    <td className="py-2 pr-2">
                      {r.recommended_entry_strategy ? (
                        <Badge variant="outline" className="text-[10px]">{ENTRY_STRATEGY_LABEL[r.recommended_entry_strategy as EntryStrategy] ?? r.recommended_entry_strategy}</Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FRSection>

      <FRSection title="Crowded-market signals tracked" description="Reference list — record observations in founder notes per market.">
        <div className="flex flex-wrap gap-1">
          {CROWDED_MARKET_SIGNALS.map((s) => (<Badge key={s} variant="outline" className="text-[10px] gap-1"><ShieldAlert className="h-3 w-3 text-amber-400" />{s}</Badge>))}
        </div>
      </FRSection>
    </FundingRadarLayout>
  );
}