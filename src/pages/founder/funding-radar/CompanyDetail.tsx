import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, NeedsVerification } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { computeTotalScore, CAPITAL_EFFICIENCY_QUESTIONS, fetchScoresForCompany } from "@/lib/fundingRadarEngine";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FRCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<any | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({
    capital_efficiency_advantage_score: 60,
    investor_validation_score: 60,
    ai_automation_advantage_score: 60,
    recurring_revenue_score: 60,
    global_expansion_score: 60,
    staff_heavy: false, sales_heavy: false, onboarding_heavy: false, support_heavy: false,
    compliance_heavy: false, delivery_manual: false, ai_can_collapse_cost: true, liftor_can_operate: true,
    rationale: "",
  });
  const [shortlistDraft, setShortlistDraft] = useState({ build_thesis: "", acquirer_pain_thesis: "", capital_efficiency_summary: "" });

  const reload = async () => {
    if (!id) return;
    const { data } = await (supabase as any).from("funding_radar_companies").select("*").eq("id", id).maybeSingle();
    setCompany(data);
    setScores(await fetchScoresForCompany(id));
  };
  useEffect(() => { reload(); }, [id]);

  const previewTotal = computeTotalScore(draft);

  const saveScore = async () => {
    if (!id) return;
    const payload = { ...draft, total_score: previewTotal, funding_company_id: id };
    const { error } = await (supabase as any).from("funding_radar_scores").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Score saved");
    reload();
  };

  const addToShortlist = async () => {
    if (!id) return;
    const { error } = await (supabase as any).from("funding_shortlist").insert({
      funding_company_id: id,
      build_thesis: shortlistDraft.build_thesis || null,
      acquirer_pain_thesis: shortlistDraft.acquirer_pain_thesis || null,
      capital_efficiency_summary: shortlistDraft.capital_efficiency_summary || null,
      status: "shortlisted",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Added to shortlist");
  };

  if (!company) {
    return <FundingRadarLayout title="Company"><p className="text-xs text-muted-foreground">Loading…</p></FundingRadarLayout>;
  }

  return (
    <FundingRadarLayout title={company.company_name} subtitle="Public-thesis profile, capital-efficiency scoring, and shortlist promotion.">
      <FRSection title="Profile" actions={
        <Badge variant="outline" className={company.needs_verification ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}>
          {company.needs_verification ? "Needs verification" : "Verified"}
        </Badge>
      }>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <Info label="Sector" value={company.sector} />
          <Info label="Country" value={company.country} />
          <Info label="Website" value={company.website ? <a className="text-primary hover:underline" href={company.website} target="_blank" rel="noreferrer">{company.website}</a> : null} />
          <Info label="Last funding" value={company.last_funding_amount_usd ? `$${Number(company.last_funding_amount_usd).toLocaleString()} ${company.last_funding_round ?? ""}` : null} />
          <Info label="Buyer type" value={company.buyer_type} />
          <Info label="Pricing logic" value={company.pricing_logic} />
          <Info label="Revenue model" value={company.revenue_model_pattern} />
          <Info label="Source URL" value={company.source_url ? <a className="text-primary hover:underline" href={company.source_url} target="_blank" rel="noreferrer">link</a> : null} />
          <Info label="Ingestion" value={company.ingestion_method} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
          <Block label="Problem thesis" value={company.problem_thesis} />
          <Block label="Customer pain" value={company.customer_pain} />
          <Block label="Market validation" value={company.market_validation} />
          <Block label="Publicly visible weakness" value={company.publicly_visible_weakness} />
          <Block label="Distinct execution route" value={company.distinct_execution_route} />
          <Block label="Notes" value={company.notes} />
        </div>
      </FRSection>

      <FRSection title="Capital Efficiency scoring" description="Why does this company need so much funding? Answer each lever; the score totals automatically.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CAPITAL_EFFICIENCY_QUESTIONS.map((q) => (
            <div key={q.key} className="flex items-center justify-between border border-border/50 rounded p-2">
              <span className="text-xs">{q.q}</span>
              <Switch checked={!!draft[q.key]} onCheckedChange={(v) => setDraft({ ...draft, [q.key]: v })} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <Score label="Capital efficiency advantage" k="capital_efficiency_advantage_score" draft={draft} setDraft={setDraft} />
          <Score label="Investor validation" k="investor_validation_score" draft={draft} setDraft={setDraft} />
          <Score label="AI automation advantage" k="ai_automation_advantage_score" draft={draft} setDraft={setDraft} />
          <Score label="Recurring revenue" k="recurring_revenue_score" draft={draft} setDraft={setDraft} />
          <Score label="Global expansion" k="global_expansion_score" draft={draft} setDraft={setDraft} />
        </div>
        <div className="mt-3"><Label className="text-xs">Rationale</Label><Textarea rows={3} value={draft.rationale} onChange={(e) => setDraft({ ...draft, rationale: e.target.value })} /></div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm">Total: <span className="text-primary font-bold text-2xl">{previewTotal}</span> / 100</div>
          <Button onClick={saveScore}>Save score</Button>
        </div>
      </FRSection>

      <FRSection title="Promote to shortlist" description="Adds this company to the Funding Radar shortlist. From there a founder can promote into the Quarterly Build Selector.">
        <div className="grid grid-cols-1 gap-3">
          <div><Label className="text-xs">Capital efficiency summary</Label><Textarea rows={2} value={shortlistDraft.capital_efficiency_summary} onChange={(e) => setShortlistDraft({ ...shortlistDraft, capital_efficiency_summary: e.target.value })} /></div>
          <div><Label className="text-xs">Build thesis (Liftor's distinct, legally clean approach)</Label><Textarea rows={2} value={shortlistDraft.build_thesis} onChange={(e) => setShortlistDraft({ ...shortlistDraft, build_thesis: e.target.value })} /></div>
          <div><Label className="text-xs">Acquirer pain thesis</Label><Textarea rows={2} value={shortlistDraft.acquirer_pain_thesis} onChange={(e) => setShortlistDraft({ ...shortlistDraft, acquirer_pain_thesis: e.target.value })} /></div>
          <div className="flex justify-end"><Button onClick={addToShortlist}>Add to shortlist</Button></div>
        </div>
      </FRSection>

      <FRSection title="Score history">
        {scores.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scores yet.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {scores.map((s) => (
              <li key={s.id} className="border border-border/50 rounded p-2 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-primary">{s.total_score ?? "—"}</span>
                <span className="text-muted-foreground">{new Date(s.scored_at).toLocaleString()}</span>
                {s.rationale && <span className="basis-full text-muted-foreground">{s.rationale}</span>}
              </li>
            ))}
          </ul>
        )}
      </FRSection>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm"><Link to="/founder/funding-radar/companies">Back to companies</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/founder/funding-radar/shortlist">Open shortlist</Link></Button>
      </div>
    </FundingRadarLayout>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <div className="text-sm">{value ? value : <NeedsVerification value={null} />}</div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-3">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <div className="text-xs">{value ? value : <NeedsVerification value={null} />}</div>
    </div>
  );
}

function Score({ label, k, draft, setDraft }: { label: string; k: string; draft: any; setDraft: any }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} max={100} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
    </div>
  );
}