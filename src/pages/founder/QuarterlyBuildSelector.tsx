import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, AlertTriangle, Plus, Trophy, FileText, Lock, Trash2, Gavel, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const BUYER_TYPES = ["strategic","pe","pe_backed_platform","competitor","corporate_venture","media_group","aggregator","other"];

// Hard buildability constitution — substrings checked against name/description/revenue model
const RED_FLAGS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(warehouse|fulfilment center|fulfillment center)\b/i, reason: "Requires warehouse" },
  { pattern: /\b(factory|manufacturing line|assembly line)\b/i, reason: "Requires factory / manufacturing" },
  { pattern: /\b(inventory|stock holding|sku-heavy)\b/i, reason: "Heavy inventory" },
  { pattern: /\b(hardware|firmware|pcb|asic|robotic|robot)\b/i, reason: "Deep hardware" },
  { pattern: /\b(rocket|satellite|spacecraft|moonshot|nuclear)\b/i, reason: "Moonshot / heavy R&D" },
  { pattern: /\b(fda|hipaa|gdpr-restricted|banking licence|insurance carrier|medical device)\b/i, reason: "Heavy regulated activity (needs adviser approval)" },
  { pattern: /\b(hire \d{2,}|team of \d{2,}|build a team)\b/i, reason: "Large team before revenue" },
  { pattern: /\$\s?\d{2,}m|\bseries [a-d]\b|raise \$/i, reason: "Large upfront capital" },
  { pattern: /\b(native ios app|native android app|kubernetes|on-prem deployment|low-level c\+\+)\b/i, reason: "Not buildable in Lovable / no-code" },
  { pattern: /\b(human concierge|24\/7 call center|manual ops only)\b/i, reason: "Liftor agents cannot operate it" },
];

function detectRedFlags(text: string, hasDistribution: boolean, hasSignal: boolean, legalRisk?: string) {
  const reasons: string[] = [];
  for (const f of RED_FLAGS) if (f.pattern.test(text)) reasons.push(f.reason);
  if (!hasDistribution) reasons.push("No distribution route declared");
  if (!hasSignal) reasons.push("No buyer / investor / competitor signal linked");
  if (legalRisk === "high") reasons.push("High legal copy risk");
  return reasons;
}

const WEIGHTS = {
  buyer_clarity_score: 0.15,
  distribution_score: 0.15,
  lovable_buildability_score: 0.15,
  liftor_operability_score: 0.15,
  low_capex_score: 0.10,
  revenue_path_score: 0.10, // stored in revenue_model presence; computed
  ninety_day_proof_score: 0.10,
  legal_ip_safety_score: 0.05,
  regulatory_friction_score: 0.05,
};

function computeTotal(c: any) {
  // regulatory_friction is inverted (lower friction = higher score). We assume the user enters 0-100 where higher = better (i.e. low friction).
  const sum =
    Number(c.buyer_clarity_score ?? 0) * WEIGHTS.buyer_clarity_score +
    Number(c.distribution_score ?? 0) * WEIGHTS.distribution_score +
    Number(c.lovable_buildability_score ?? 0) * WEIGHTS.lovable_buildability_score +
    Number(c.liftor_operability_score ?? 0) * WEIGHTS.liftor_operability_score +
    Number(c.low_capex_score ?? 0) * WEIGHTS.low_capex_score +
    Number(c._revenue_path_score ?? (c.revenue_model ? 80 : 30)) * WEIGHTS.revenue_path_score +
    Number(c.ninety_day_proof_score ?? 0) * WEIGHTS.ninety_day_proof_score +
    Number(c.legal_ip_safety_score ?? 0) * WEIGHTS.legal_ip_safety_score +
    Number(c.regulatory_friction_score ?? 0) * WEIGHTS.regulatory_friction_score;
  return Math.round(sum);
}

const currentQuarter = () => {
  const d = new Date();
  return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() };
};

type DraftCandidate = {
  candidate_name: string;
  description: string;
  source_signal: string;
  target_buyer_type: string;
  target_customer: string;
  revenue_model: string;
  distribution_route: string;
  legal_copy_risk: "low" | "medium" | "high";
  lovable_buildability_score: number;
  liftor_operability_score: number;
  low_capex_score: number;
  distribution_score: number;
  buyer_clarity_score: number;
  regulatory_friction_score: number;
  legal_ip_safety_score: number;
  ninety_day_proof_score: number;
  linked_signal_id?: string;
  linked_company_id?: string;
  linked_competitor_id?: string;
  // Funding Radar context (optional — pre-filled when promoted from funding_shortlist)
  funding_shortlist_id?: string;
  funding_company_id?: string;
  funding_cluster_id?: string;
  capital_efficiency_advantage_score?: number;
  investor_validation_score?: number;
  ai_automation_advantage_score?: number;
  recurring_revenue_score?: number;
  global_expansion_score?: number;
  funding_source_summary?: string;
  build_thesis?: string;
  acquirer_pain_thesis?: string;
};

const emptyDraft: DraftCandidate = {
  candidate_name: "", description: "", source_signal: "", target_buyer_type: "strategic",
  target_customer: "", revenue_model: "", distribution_route: "", legal_copy_risk: "low",
  lovable_buildability_score: 70, liftor_operability_score: 70, low_capex_score: 70,
  distribution_score: 60, buyer_clarity_score: 60, regulatory_friction_score: 70,
  legal_ip_safety_score: 80, ninety_day_proof_score: 60,
};

export default function QuarterlyBuildSelector() {
  const qc = useQueryClient();
  const { quarter, year } = currentQuarter();
  const [q, setQ] = useState(quarter);
  const [y, setY] = useState(year);
  const [tab, setTab] = useState("board");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<DraftCandidate>(emptyDraft);
  const [memoFor, setMemoFor] = useState<any | null>(null);

  const candidatesQ = useQuery({
    queryKey: ["ma_build_candidates", q, y],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_build_candidates").select("*").eq("quarter", q).eq("year", y).order("total_build_score", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const allRejectedQ = useQuery({
    queryKey: ["ma_build_candidates_rejected"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_build_candidates").select("*").eq("recommendation_status", "rejected").order("updated_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const signalsQ = useQuery({
    queryKey: ["ma_weekly_signals_min"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_weekly_signals").select("id,signal_title,signal_summary").order("created_at", { ascending: false }).limit(100);
      if (error) return []; return data ?? [];
    },
  });
  const companiesQ = useQuery({
    queryKey: ["ma_companies_min2"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_companies").select("id,company_name,company_type").order("company_name");
      if (error) return []; return data ?? [];
    },
  });
  const competitorsQ = useQuery({
    queryKey: ["ma_competitor_profiles_min2"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_competitor_profiles").select("id,company_id,legal_copy_risk, ma_companies(company_name)");
      if (error) return []; return data ?? [];
    },
  });
  const buyerMatchesQ = useQuery({
    queryKey: ["ma_buyer_matches_min2"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_buyer_matches").select("id,portfolio_asset_id,buyer_company_id,buyer_warmth_status,fit_score, ma_companies:buyer_company_id(company_name)");
      if (error) return []; return data ?? [];
    },
  });

  const selected = (candidatesQ.data ?? []).filter((c: any) => c.recommendation_status === "selected");
  const shortlisted = (candidatesQ.data ?? []).filter((c: any) => c.recommendation_status === "shortlisted");
  const candidates = (candidatesQ.data ?? []).filter((c: any) => c.recommendation_status === "candidate");
  const parked = (candidatesQ.data ?? []).filter((c: any) => c.recommendation_status === "parked");
  const rejected = (candidatesQ.data ?? []).filter((c: any) => c.recommendation_status === "rejected");
  const needsAdviser = parked.filter((c: any) => (c.rejection_reason ?? "").startsWith("[NEEDS_ADVISER]"));
  const parkedOnly = parked.filter((c: any) => !(c.rejection_reason ?? "").startsWith("[NEEDS_ADVISER]"));

  const redFlags = useMemo(() => {
    const text = `${draft.candidate_name} ${draft.description} ${draft.revenue_model}`;
    return detectRedFlags(text, !!draft.distribution_route.trim(), !!(draft.linked_signal_id || draft.linked_company_id || draft.linked_competitor_id), draft.legal_copy_risk);
  }, [draft]);

  const previewTotal = useMemo(() => computeTotal({ ...draft, _revenue_path_score: draft.revenue_model.trim() ? 80 : 30 }), [draft]);

  const saveDraft = async (status: "candidate" | "shortlisted" | "selected" | "rejected" | "parked", overrideReason?: string) => {
    if (!draft.candidate_name.trim()) { toast.error("Candidate name required"); return; }
    const flags = redFlags;
    const wantsAdviser = !!overrideReason && overrideReason.startsWith("[NEEDS_ADVISER]");
    let finalStatus = status;
    let rejection: string | null = null;
    if (flags.length > 0 && status !== "rejected" && status !== "parked") {
      finalStatus = "rejected";
      rejection = `Auto-rejected by buildability constitution: ${flags.join("; ")}`;
    } else if (overrideReason) {
      rejection = overrideReason;
      if (wantsAdviser) finalStatus = "parked";
    }
    if (finalStatus === "selected") {
      // Enforce one-selected-per-quarter rule
      if (selected.length >= 1) { toast.error("Only one selected build per quarter. Demote the current selection first."); return; }
    }
    const total = computeTotal({ ...draft, _revenue_path_score: draft.revenue_model.trim() ? 80 : 30 });
    const payload: any = {
      candidate_name: draft.candidate_name,
      description: draft.description,
      source_signal: [
        draft.source_signal,
        draft.linked_signal_id ? `signal:${draft.linked_signal_id}` : null,
        draft.linked_company_id ? `company:${draft.linked_company_id}` : null,
        draft.linked_competitor_id ? `competitor:${draft.linked_competitor_id}` : null,
        draft.distribution_route ? `distribution:${draft.distribution_route}` : null,
      ].filter(Boolean).join(" | "),
      target_buyer_type: draft.target_buyer_type,
      target_customer: draft.target_customer,
      revenue_model: draft.revenue_model,
      lovable_buildability_score: draft.lovable_buildability_score,
      liftor_operability_score: draft.liftor_operability_score,
      low_capex_score: draft.low_capex_score,
      distribution_score: draft.distribution_score,
      buyer_clarity_score: draft.buyer_clarity_score,
      regulatory_friction_score: draft.regulatory_friction_score,
      legal_ip_safety_score: draft.legal_ip_safety_score,
      ninety_day_proof_score: draft.ninety_day_proof_score,
      total_build_score: total,
      rejection_reason: rejection,
      recommendation_status: finalStatus,
      quarter: q,
      year: y,
      // Funding Radar linkage (nullable — preserved when provided)
      funding_shortlist_id: draft.funding_shortlist_id ?? null,
      funding_company_id: draft.funding_company_id ?? null,
      funding_cluster_id: draft.funding_cluster_id ?? null,
      capital_efficiency_advantage_score: draft.capital_efficiency_advantage_score ?? null,
      investor_validation_score: draft.investor_validation_score ?? null,
      ai_automation_advantage_score: draft.ai_automation_advantage_score ?? null,
      recurring_revenue_score: draft.recurring_revenue_score ?? null,
      global_expansion_score: draft.global_expansion_score ?? null,
      funding_source_summary: draft.funding_source_summary || null,
      build_thesis: draft.build_thesis || null,
      acquirer_pain_thesis: draft.acquirer_pain_thesis || null,
    };
    const { error } = await (supabase as any).from("ma_build_candidates").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`Saved as ${finalStatus}${flags.length ? " (auto-rejected — see reason)" : ""}`);
    setDraft(emptyDraft);
    setDraftOpen(false);
    qc.invalidateQueries({ queryKey: ["ma_build_candidates", q, y] });
    qc.invalidateQueries({ queryKey: ["ma_build_candidates_rejected"] });
  };

  const changeStatus = async (id: string, status: string, reason?: string) => {
    if (status === "selected" && selected.length >= 1) { toast.error("Only one selected build per quarter."); return; }
    const { error } = await (supabase as any).from("ma_build_candidates").update({ recommendation_status: status, ...(reason !== undefined ? { rejection_reason: reason } : {}) }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["ma_build_candidates", q, y] });
    qc.invalidateQueries({ queryKey: ["ma_build_candidates_rejected"] });
  };

  const promoteToAsset = async (c: any) => {
    const payload: any = {
      asset_name: c.candidate_name,
      asset_type: "other",
      status: "validating",
      sector: null,
      next_decision: "build",
      next_action: `From Q${c.quarter} ${c.year} build candidate. Source: ${c.source_signal ?? "—"}. Total build score ${c.total_build_score ?? "—"}.`,
      needs_review: true,
    };
    const { data: asset, error } = await (supabase as any).from("ma_portfolio_assets").insert(payload).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success(`Promoted to portfolio asset (validating). Linked candidate ${c.id.slice(0,8)}.`);
    // Stamp link back into the candidate's rejection_reason field as a note (no FK available)
    await (supabase as any).from("ma_build_candidates").update({ rejection_reason: `[PROMOTED] portfolio_asset:${asset.id}` }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["ma_build_candidates", q, y] });
    qc.invalidateQueries({ queryKey: ["ma_portfolio_assets"] });
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="h-7"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" />Portfolio & Exit</Link></Button>
            <h1 className="text-3xl font-bold flex items-center gap-2 mt-1"><Trophy className="h-7 w-7 text-primary" />Quarterly Build Selector</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">Strict, one-build-per-quarter selector. Scored against the buildability constitution. Fantasy builds are auto-rejected.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-400"><AlertTriangle className="h-3 w-3" />One serious build per quarter</Badge>
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />External outreach LOCKED_BY_DESIGN</Badge>
          </div>
        </div>

        <Card className="tech-card">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div><Label className="text-xs">Quarter</Label>
              <Select value={String(q)} onValueChange={(v) => setQ(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>Q{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Year</Label>
              <Input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} className="w-28" />
            </div>
            <div className="ml-auto flex gap-2">
              <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add build candidate</Button></DialogTrigger>
                <DraftDialog
                  draft={draft} setDraft={setDraft}
                  redFlags={redFlags} previewTotal={previewTotal}
                  signals={signalsQ.data ?? []} companies={companiesQ.data ?? []} competitors={competitorsQ.data ?? []}
                  onSave={saveDraft}
                  onClose={() => setDraftOpen(false)}
                />
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="board">Decision board</TabsTrigger>
            <TabsTrigger value="all">All candidates</TabsTrigger>
            <TabsTrigger value="reject">Reject list</TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <Column title="Selected Build" tone="primary" rows={selected} onMemo={setMemoFor} onChangeStatus={changeStatus} onPromote={promoteToAsset} />
              <Column title="Shortlisted" tone="blue" rows={shortlisted} onMemo={setMemoFor} onChangeStatus={changeStatus} onPromote={promoteToAsset} />
              <Column title="Candidates" tone="muted" rows={candidates} onMemo={setMemoFor} onChangeStatus={changeStatus} onPromote={promoteToAsset} />
              <Column title="Needs Adviser Review" tone="amber" rows={needsAdviser} onMemo={setMemoFor} onChangeStatus={changeStatus} onPromote={promoteToAsset} />
              <Column title="Parked" tone="muted" rows={parkedOnly} onMemo={setMemoFor} onChangeStatus={changeStatus} onPromote={promoteToAsset} />
            </div>
          </TabsContent>

          <TabsContent value="all">
            <Card className="tech-card">
              <CardHeader><CardTitle>All candidates Q{q} {y}</CardTitle></CardHeader>
              <CardContent>
                {(candidatesQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No candidates this quarter. Add one above.</p>
                ) : <CandidatesTable rows={candidatesQ.data ?? []} onMemo={setMemoFor} onChangeStatus={changeStatus} onPromote={promoteToAsset} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reject">
            <Card className="tech-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" />Reject list — do not revisit</CardTitle></CardHeader>
              <CardContent>
                {(allRejectedQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No rejected ideas yet.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Candidate</TableHead><TableHead>Quarter</TableHead><TableHead>Score</TableHead><TableHead>Reason</TableHead><TableHead>Rejected</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(allRejectedQ.data ?? []).map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.candidate_name}<div className="text-xs text-muted-foreground line-clamp-1">{c.description ?? ""}</div></TableCell>
                          <TableCell className="text-xs">Q{c.quarter} {c.year}</TableCell>
                          <TableCell className="text-xs">{c.total_build_score ?? "—"}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-[420px]">{c.rejection_reason ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <BuildMemoDialog
          open={!!memoFor}
          onOpenChange={(o) => !o && setMemoFor(null)}
          candidate={memoFor}
          buyerMatches={buyerMatchesQ.data ?? []}
          competitors={competitorsQ.data ?? []}
          onPromote={promoteToAsset}
        />
      </div>
    </FounderLayout>
  );
}

function DraftDialog({ draft, setDraft, redFlags, previewTotal, signals, companies, competitors, onSave, onClose }: any) {
  const set = (k: keyof DraftCandidate, v: any) => setDraft({ ...draft, [k]: v });
  return (
    <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New build candidate</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2"><Label className="text-xs">Candidate name *</Label><Input value={draft.candidate_name} onChange={(e) => set("candidate_name", e.target.value)} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Plain-English what this is and why" /></div>
        <div><Label className="text-xs">Target buyer type</Label>
          <Select value={draft.target_buyer_type} onValueChange={(v) => set("target_buyer_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUYER_TYPES.map(b => <SelectItem key={b} value={b}>{b.replace(/_/g," ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Target customer</Label><Input value={draft.target_customer} onChange={(e) => set("target_customer", e.target.value)} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Revenue model</Label><Input value={draft.revenue_model} onChange={(e) => set("revenue_model", e.target.value)} placeholder="e.g. SaaS subscription, retainer, transaction fee" /></div>
        <div className="md:col-span-2"><Label className="text-xs">Distribution route</Label><Input value={draft.distribution_route} onChange={(e) => set("distribution_route", e.target.value)} placeholder="e.g. founder outbound + partner referrals" /></div>
        <div><Label className="text-xs">Legal copy risk</Label>
          <Select value={draft.legal_copy_risk} onValueChange={(v: any) => set("legal_copy_risk", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["low","medium","high"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Source signal text</Label><Input value={draft.source_signal} onChange={(e) => set("source_signal", e.target.value)} /></div>
        <div><Label className="text-xs">Linked weekly signal</Label>
          <Select value={draft.linked_signal_id ?? ""} onValueChange={(v) => set("linked_signal_id", v)}>
            <SelectTrigger><SelectValue placeholder="(optional)" /></SelectTrigger>
            <SelectContent>{signals.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.signal_title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Linked company (buyer/investor signal)</Label>
          <Select value={draft.linked_company_id ?? ""} onValueChange={(v) => set("linked_company_id", v)}>
            <SelectTrigger><SelectValue placeholder="(optional)" /></SelectTrigger>
            <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Linked competitor proof</Label>
          <Select value={draft.linked_competitor_id ?? ""} onValueChange={(v) => set("linked_competitor_id", v)}>
            <SelectTrigger><SelectValue placeholder="(optional)" /></SelectTrigger>
            <SelectContent>{competitors.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.ma_companies?.company_name ?? c.id}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 border-t border-border pt-3"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Scores (0–100). Higher = better.</div></div>
        {[
          ["buyer_clarity_score","Buyer clarity (15%)"],
          ["distribution_score","Distribution path (15%)"],
          ["lovable_buildability_score","Lovable buildability (15%)"],
          ["liftor_operability_score","Liftor operability (15%)"],
          ["low_capex_score","Low capex (10%)"],
          ["ninety_day_proof_score","90-day proof potential (10%)"],
          ["legal_ip_safety_score","Legal / IP safety (5%)"],
          ["regulatory_friction_score","Regulatory friction — higher = lower friction (5%)"],
        ].map(([k, l]) => (
          <div key={k}>
            <Label className="text-xs">{l}</Label>
            <Input type="number" min={0} max={100} value={(draft as any)[k]} onChange={(e) => set(k as any, Math.max(0, Math.min(100, Number(e.target.value))))} />
          </div>
        ))}
        <div className="md:col-span-2 rounded border border-border bg-secondary/40 p-3 flex items-center justify-between">
          <div className="text-sm">Total build score (auto)</div>
          <div className="text-2xl font-semibold">{previewTotal}</div>
        </div>

        <div className="md:col-span-2 border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Funding Radar context (optional)</div>
          <p className="text-[11px] text-muted-foreground mb-2">Populated automatically when promoted from <code>/founder/funding-radar/shortlist</code>. Manual entry is allowed but must reference a real funded company captured in Funding Radar — no scraped or restricted IP.</p>
        </div>
        <div><Label className="text-xs">Linked funded company id</Label><Input value={draft.funding_company_id ?? ""} onChange={(e) => set("funding_company_id", e.target.value || undefined)} placeholder="funding_radar_companies.id" /></div>
        <div><Label className="text-xs">Linked problem cluster id</Label><Input value={draft.funding_cluster_id ?? ""} onChange={(e) => set("funding_cluster_id", e.target.value || undefined)} placeholder="funding_problem_clusters.id" /></div>
        {[
          ["capital_efficiency_advantage_score","Capital Efficiency Advantage (0–100)"],
          ["investor_validation_score","Investor validation (0–100)"],
          ["ai_automation_advantage_score","AI automation advantage (0–100)"],
          ["recurring_revenue_score","Recurring revenue potential (0–100)"],
          ["global_expansion_score","Global expansion potential (0–100)"],
        ].map(([k, l]) => (
          <div key={k}>
            <Label className="text-xs">{l}</Label>
            <Input type="number" min={0} max={100} value={(draft as any)[k] ?? ""} onChange={(e) => set(k as any, e.target.value === "" ? undefined : Math.max(0, Math.min(100, Number(e.target.value))))} />
          </div>
        ))}
        <div className="md:col-span-2"><Label className="text-xs">Why the funded company needs capital / cost areas Liftor can collapse with AI</Label><Textarea rows={2} value={draft.funding_source_summary ?? ""} onChange={(e) => set("funding_source_summary", e.target.value || undefined)} placeholder="e.g. Series A $12m. Staff-heavy ops (sales + CS headcount). Liftor collapses outbound + onboarding + reporting." /></div>
        <div className="md:col-span-2"><Label className="text-xs">Build thesis (legally distinct execution route)</Label><Textarea rows={2} value={draft.build_thesis ?? ""} onChange={(e) => set("build_thesis", e.target.value || undefined)} placeholder="Public-problem thesis only. No copied branding, copy, code, or customer data." /></div>
        <div className="md:col-span-2"><Label className="text-xs">Acquirer pain thesis</Label><Textarea rows={2} value={draft.acquirer_pain_thesis ?? ""} onChange={(e) => set("acquirer_pain_thesis", e.target.value || undefined)} placeholder="Which strategic buyer/PE feels the pain this solves and why." /></div>

        {redFlags.length > 0 && (
          <div className="md:col-span-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2 font-medium mb-1"><AlertTriangle className="h-4 w-4" />Hard buildability red flags — will auto-reject unless explicitly parked</div>
            <ul className="list-disc pl-5 text-xs">{redFlags.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
      </div>
      <DialogFooter className="flex-wrap gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={() => onSave("parked", "[NEEDS_ADVISER] Park for adviser review")}><Gavel className="h-4 w-4 mr-1" />Send to adviser review</Button>
        <Button variant="outline" onClick={() => onSave("rejected", "Manual reject")}>Reject</Button>
        <Button variant="outline" onClick={() => onSave("candidate")}>Save as candidate</Button>
        <Button variant="outline" onClick={() => onSave("shortlisted")}>Shortlist</Button>
        <Button onClick={() => onSave("selected")} disabled={redFlags.length > 0}>Select this build</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Column({ title, tone, rows, onMemo, onChangeStatus, onPromote }: any) {
  const toneCls = tone === "primary" ? "border-primary/40 bg-primary/5" : tone === "amber" ? "border-amber-500/30 bg-amber-500/5" : tone === "blue" ? "border-blue-500/30 bg-blue-500/5" : "";
  return (
    <Card className={`tech-card ${toneCls}`}>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">{title}<Badge variant="outline" className="text-[10px]">{rows.length}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">Empty.</p> : rows.map((c: any) => (
          <div key={c.id} className="rounded border border-border p-2 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm leading-tight">{c.candidate_name}</div>
              <Badge variant="outline" className="text-[10px]">{c.total_build_score ?? 0}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{c.description ?? "—"}</div>
            {c.funding_company_id && (
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-300">Funding Radar</Badge>
                {c.capital_efficiency_advantage_score != null && <Badge variant="outline" className="text-[9px]">CE {c.capital_efficiency_advantage_score}</Badge>}
              </div>
            )}
            {c.rejection_reason && <div className="text-[10px] text-amber-400 mt-1">{c.rejection_reason}</div>}
            <div className="flex flex-wrap gap-1 mt-2">
              <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => onMemo(c)}><FileText className="h-3 w-3 mr-1" />Memo</Button>
              {c.recommendation_status !== "selected" && <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => onChangeStatus(c.id, "selected")}>Select</Button>}
              {c.recommendation_status !== "shortlisted" && <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => onChangeStatus(c.id, "shortlisted")}>Shortlist</Button>}
              {c.recommendation_status !== "parked" && <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => onChangeStatus(c.id, "parked")}>Park</Button>}
              {c.recommendation_status !== "rejected" && <Button size="sm" variant="ghost" className="h-6 text-[11px] text-destructive" onClick={() => onChangeStatus(c.id, "rejected", "Manual reject")}><Trash2 className="h-3 w-3" /></Button>}
              {c.recommendation_status === "selected" && <Button size="sm" className="h-6 text-[11px]" onClick={() => onPromote(c)}>Promote → asset</Button>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CandidatesTable({ rows, onMemo, onChangeStatus, onPromote }: any) {
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Candidate</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Score</TableHead>
        <TableHead>Buyer</TableHead><TableHead>Revenue model</TableHead><TableHead>Reason</TableHead><TableHead></TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((c: any) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.candidate_name}<div className="text-xs text-muted-foreground line-clamp-1">{c.description ?? ""}</div></TableCell>
            <TableCell><Badge variant="outline" className="text-[10px]">{c.recommendation_status}</Badge></TableCell>
            <TableCell className="text-right">{c.total_build_score ?? 0}</TableCell>
            <TableCell className="text-xs">{c.target_buyer_type ?? "—"}</TableCell>
            <TableCell className="text-xs">{c.revenue_model ?? "—"}</TableCell>
            <TableCell className="text-xs max-w-[260px] truncate" title={c.rejection_reason ?? ""}>{c.rejection_reason ?? "—"}</TableCell>
            <TableCell className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onMemo(c)}><FileText className="h-4 w-4" /></Button>
              {c.recommendation_status === "selected" && <Button size="sm" onClick={() => onPromote(c)}>Promote</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BuildMemoDialog({ open, onOpenChange, candidate, buyerMatches, competitors, onPromote }: any) {
  if (!candidate) return null;
  const relatedBuyers = (buyerMatches ?? []).slice(0, 5);
  const relatedComps = (competitors ?? []).slice(0, 5);
  const memoSections: { h: string; v: string }[] = [
    { h: "What we are building", v: candidate.description ?? "—" },
    { h: "Why now", v: candidate.source_signal ?? "—" },
    ...(candidate.funding_company_id || candidate.build_thesis || candidate.acquirer_pain_thesis ? [
      { h: "Funding Radar — funded company", v: candidate.funding_source_summary ?? `Linked funding_company_id ${candidate.funding_company_id ?? "—"}` },
      { h: "Funding Radar — problem cluster", v: candidate.funding_cluster_id ?? "—" },
      { h: "Capital Efficiency Advantage", v: [
          candidate.capital_efficiency_advantage_score != null ? `CE advantage ${candidate.capital_efficiency_advantage_score}/100` : null,
          candidate.investor_validation_score != null ? `Investor validation ${candidate.investor_validation_score}/100` : null,
          candidate.ai_automation_advantage_score != null ? `AI automation ${candidate.ai_automation_advantage_score}/100` : null,
          candidate.recurring_revenue_score != null ? `Recurring revenue ${candidate.recurring_revenue_score}/100` : null,
          candidate.global_expansion_score != null ? `Global expansion ${candidate.global_expansion_score}/100` : null,
        ].filter(Boolean).join(" · ") || "—" },
      { h: "Build thesis (legally distinct execution route)", v: candidate.build_thesis ?? "—" },
      { h: "Acquirer pain thesis", v: candidate.acquirer_pain_thesis ?? "—" },
    ] : []),
    { h: "Buyer / investor signal", v: relatedBuyers.length ? relatedBuyers.map((b: any) => `${b.ma_companies?.company_name ?? "?"} (${b.buyer_warmth_status}, fit ${b.fit_score ?? "—"})`).join("; ") : `Target buyer type: ${candidate.target_buyer_type ?? "—"}` },
    { h: "Competitor proof", v: relatedComps.length ? relatedComps.map((c: any) => `${c.ma_companies?.company_name ?? "?"} — legal risk ${c.legal_copy_risk}`).join("; ") : "No competitor proof linked." },
    { h: "Target customer", v: candidate.target_customer ?? "—" },
    { h: "Revenue model", v: candidate.revenue_model ?? "—" },
    { h: "Lovable build scope", v: `Buildability score ${candidate.lovable_buildability_score ?? "—"}/100. Stay inside Lovable/no-code. Single asset MVP first.` },
    { h: "Liftor agent scope", v: `Operability score ${candidate.liftor_operability_score ?? "—"}/100. Agents: outreach, CRM, inbox, content, reporting, buyer warm-up.` },
    { h: "90-day proof target", v: `Score ${candidate.ninety_day_proof_score ?? "—"}/100. Define a single objective metric (revenue, signed LOIs, or active users) achievable in 90 days.` },
    { h: "Target exit logic", v: `Buyer type ${candidate.target_buyer_type ?? "—"}. Use Exit Valuation Engine to set required ARR/profit for the desired exit multiple.` },
    { h: "Kill criteria", v: "Miss the 90-day proof metric by >50%, OR no qualified buyer warming by month 6, OR cost-to-revenue ratio worsens for 2 consecutive months." },
    { h: "Data room requirements", v: "Cap table, IP assignments, supplier/SLA list, monthly P&L from month 1, customer contracts, agent operating logs." },
    { h: "Human oversight requirements", v: "Founder approval on commercial commitments. Human-in-the-loop for all AI-suggested external actions. Weekly review against execution targets." },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Build Memo — {candidate.candidate_name}</span>
            <Badge variant="outline">{candidate.recommendation_status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3">
          {memoSections.map((s) => (
            <div key={s.h} className="rounded border border-border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.h}</div>
              <div className="text-sm whitespace-pre-wrap mt-1">{s.v}</div>
            </div>
          ))}
          {candidate.rejection_reason && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
              <div className="font-medium">Note on status</div>
              <div className="text-xs mt-1">{candidate.rejection_reason}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          {candidate.recommendation_status === "selected" && <Button onClick={() => onPromote(candidate)}>Promote to Portfolio Asset</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}