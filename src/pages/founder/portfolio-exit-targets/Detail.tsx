import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PETLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  fetchTargets, fetchSettings, upsertTarget, compute, syncAlertsForTarget, STAGE_META, fmtMoney,
  type PortfolioExitTarget, type Settings,
} from "@/lib/portfolioExitTargetEngine";

const STATUSES = ["idea","built","activated","live","paused","parked","sold"] as const;
const MODELS = ["recurring_subscription","retainer","transaction","marketplace","licence","hybrid","one_off"] as const;
const ROUTES = ["hold","licence","partnership","strategic_sale","marketplace_sale","PE_platform_sale","option_to_buy","not_ready"] as const;
const EVIDENCE = ["missing","partial","ready","verified"] as const;

export default function PETDetail() {
  const { id = "" } = useParams();
  const [target, setTarget] = useState<PortfolioExitTarget | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Partial<PortfolioExitTarget>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const [ts, s] = await Promise.all([fetchTargets(), fetchSettings()]);
    const found = ts.find(t => t.id === id) ?? null;
    setTarget(found); setSettings(s); setDraft(found ?? {});
  }
  useEffect(() => { void load(); }, [id]);

  const computed = useMemo(() => target && settings ? compute({ ...target, ...draft } as PortfolioExitTarget, settings) : null, [target, settings, draft]);

  async function save() {
    if (!target) return;
    setSaving(true);
    try {
      const saved = await upsertTarget({ ...target, ...draft });
      if (settings) await syncAlertsForTarget(saved, settings);
      toast.success("Saved");
      setTarget(saved); setDraft(saved);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  if (!target || !settings || !computed) return (
    <PETLayout title="Business detail"><p className="text-sm text-muted-foreground">Loading or not found. <Link to="/founder/portfolio-exit-targets/businesses" className="text-primary hover:underline">Back to list</Link></p></PETLayout>
  );

  const t = { ...target, ...draft } as PortfolioExitTarget;
  const c = computed;

  const customerLadder = [10, 25, 50, 100, 150, c.customers_needed_usd, c.customers_needed_gbp].filter(n => n > 0);
  const buyerKPIs = [
    { label: "Recurring revenue model", ok: ["recurring_subscription","retainer","marketplace","licence","hybrid"].includes(t.revenue_model) },
    { label: "Gross margin ≥ 60%", ok: (t.gross_margin_percent ?? 0) >= 60 },
    { label: "Churn ≤ 5%", ok: t.churn_percent != null && t.churn_percent <= 5 },
    { label: "Repeatability ≥ 70", ok: (t.repeatability_score ?? 0) >= 70 },
    { label: "Compliance ≥ 70", ok: (t.compliance_readiness_score ?? 0) >= 70 },
    { label: "Founder dependency ≤ 30", ok: (t.founder_dependency_score ?? 100) <= 30 },
    { label: "AI-operated ≥ 70", ok: (t.ai_operated_score ?? 0) >= 70 },
    { label: "Buyer fit categorised", ok: !!t.buyer_fit_category },
  ];
  const evidenceChecklist = [
    { label: "Customer evidence", ok: t.current_active_customers >= 10 },
    { label: "Margin evidence", ok: t.gross_margin_percent != null },
    { label: "Churn evidence", ok: t.churn_percent != null },
    { label: "CAC evidence", ok: t.customer_acquisition_cost != null },
    { label: "Compliance evidence", ok: (t.compliance_readiness_score ?? 0) >= 50 },
    { label: "Evidence pack ready", ok: ["ready","verified"].includes(t.evidence_pack_status) },
  ];

  return (
    <PETLayout title={t.business_name} subtitle={`Stage: ${STAGE_META[c.derived_exit_stage].label}. Founder approval required for any external M&A, buyer, adviser or investor action.`}>
      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="MRR" value={fmtMoney(c.mrr)} />
        <Stat label="ARR" value={fmtMoney(c.arr)} />
        <Stat label="Sale-readiness" value={`${c.sale_readiness_score} / 100`} tone={c.sale_readiness_score >= 70 ? "good" : c.sale_readiness_score >= 40 ? "warn" : "muted"} />
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Target ladder</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-xs">
          <Row label={`$5m ARR equivalent (target ${fmtMoney(t.target_arr_usd ?? settings.default_target_arr_usd)})`}>
            <Progress value={c.progress_to_usd_percent} className="h-2" />
            <span className="text-[10px] text-muted-foreground">{c.progress_to_usd_percent.toFixed(1)}% · {c.customers_remaining_usd} more customers needed</span>
          </Row>
          <Row label={`£5m ARR (target ${fmtMoney(t.target_arr_gbp ?? settings.default_target_arr_gbp, "GBP")})`}>
            <Progress value={c.progress_to_gbp_percent} className="h-2" />
            <span className="text-[10px] text-muted-foreground">{c.progress_to_gbp_percent.toFixed(1)}% · {c.customers_remaining_gbp} more customers needed</span>
          </Row>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Customer ladder</p>
            <div className="flex gap-2 flex-wrap">
              {customerLadder.map(n => (
                <Badge key={n} variant="outline" className={t.current_active_customers >= n ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "border-border/50 text-muted-foreground"}>
                  {n}{t.current_active_customers >= n ? " ✓" : ""}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Margin & burn</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <Line label="Gross margin" value={`${t.gross_margin_percent ?? "—"}%`} />
            <Line label="Monthly AI cost" value={fmtMoney(t.monthly_ai_cost)} />
            <Line label="Monthly human delivery" value={fmtMoney(t.monthly_human_delivery_cost)} />
            <Line label="Monthly other opex" value={fmtMoney(t.monthly_other_operating_cost)} />
            <Line label="Est. monthly P/L" value={fmtMoney(c.estimated_monthly_profit)} tone={c.estimated_monthly_profit >= 0 ? "good" : "warn"} />
            <Line label="CAC payback" value={c.cac_payback_months != null ? `${c.cac_payback_months.toFixed(1)} months` : "—"} />
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Buyer KPI checklist</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {buyerKPIs.map(k => <Line key={k.label} label={k.label} value={k.ok ? "✓" : "—"} tone={k.ok ? "good" : "muted"} />)}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Evidence pack</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {evidenceChecklist.map(k => <Line key={k.label} label={k.label} value={k.ok ? "✓" : "missing"} tone={k.ok ? "good" : "warn"} />)}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recommended next action</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <p className="text-primary/90">{t.next_action ?? recommendNext(t, c)}</p>
            <p className="text-[11px] text-muted-foreground">Liftor recommends and prepares. Founder approval required for any external M&A, buyer, adviser or investor outreach.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Edit business</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 text-xs">
          <Field label="Business name"><Input value={(draft.business_name ?? target.business_name)} onChange={e => setDraft({ ...draft, business_name: e.target.value })} /></Field>
          <Field label="Status"><Select value={(draft.business_status ?? target.business_status)} onChange={v => setDraft({ ...draft, business_status: v as any })} options={STATUSES as readonly string[]} /></Field>
          <Field label="Revenue model"><Select value={(draft.revenue_model ?? target.revenue_model)} onChange={v => setDraft({ ...draft, revenue_model: v as any })} options={MODELS as readonly string[]} /></Field>
          <Field label="Price / customer / month"><Num value={draft.monthly_price_per_customer ?? target.monthly_price_per_customer} onChange={v => setDraft({ ...draft, monthly_price_per_customer: v })} /></Field>
          <Field label="Active customers"><Num value={draft.current_active_customers ?? target.current_active_customers} onChange={v => setDraft({ ...draft, current_active_customers: v })} /></Field>
          <Field label="Target ARR (USD)"><Num value={draft.target_arr_usd ?? target.target_arr_usd ?? settings.default_target_arr_usd} onChange={v => setDraft({ ...draft, target_arr_usd: v })} /></Field>
          <Field label="Target ARR (GBP)"><Num value={draft.target_arr_gbp ?? target.target_arr_gbp ?? settings.default_target_arr_gbp} onChange={v => setDraft({ ...draft, target_arr_gbp: v })} /></Field>
          <Field label="Gross margin %"><Num value={draft.gross_margin_percent ?? target.gross_margin_percent} onChange={v => setDraft({ ...draft, gross_margin_percent: v })} /></Field>
          <Field label="Churn %"><Num value={draft.churn_percent ?? target.churn_percent} onChange={v => setDraft({ ...draft, churn_percent: v })} /></Field>
          <Field label="Monthly AI cost"><Num value={draft.monthly_ai_cost ?? target.monthly_ai_cost} onChange={v => setDraft({ ...draft, monthly_ai_cost: v })} /></Field>
          <Field label="Monthly human delivery cost"><Num value={draft.monthly_human_delivery_cost ?? target.monthly_human_delivery_cost} onChange={v => setDraft({ ...draft, monthly_human_delivery_cost: v })} /></Field>
          <Field label="Monthly other opex"><Num value={draft.monthly_other_operating_cost ?? target.monthly_other_operating_cost} onChange={v => setDraft({ ...draft, monthly_other_operating_cost: v })} /></Field>
          <Field label="CAC"><Num value={draft.customer_acquisition_cost ?? target.customer_acquisition_cost} onChange={v => setDraft({ ...draft, customer_acquisition_cost: v })} /></Field>
          <Field label="Founder dependency (0-100)"><Num value={draft.founder_dependency_score ?? target.founder_dependency_score} onChange={v => setDraft({ ...draft, founder_dependency_score: v })} /></Field>
          <Field label="AI-operated (0-100)"><Num value={draft.ai_operated_score ?? target.ai_operated_score} onChange={v => setDraft({ ...draft, ai_operated_score: v })} /></Field>
          <Field label="Repeatability (0-100)"><Num value={draft.repeatability_score ?? target.repeatability_score} onChange={v => setDraft({ ...draft, repeatability_score: v })} /></Field>
          <Field label="Compliance readiness (0-100)"><Num value={draft.compliance_readiness_score ?? target.compliance_readiness_score} onChange={v => setDraft({ ...draft, compliance_readiness_score: v })} /></Field>
          <Field label="Evidence pack"><Select value={(draft.evidence_pack_status ?? target.evidence_pack_status)} onChange={v => setDraft({ ...draft, evidence_pack_status: v as any })} options={EVIDENCE as readonly string[]} /></Field>
          <Field label="Buyer fit category"><Input value={(draft.buyer_fit_category ?? target.buyer_fit_category) ?? ""} onChange={e => setDraft({ ...draft, buyer_fit_category: e.target.value })} placeholder="e.g. PE platform, strategic, marketplace" /></Field>
          <Field label="Likely exit route"><Select value={(draft.likely_exit_route ?? target.likely_exit_route)} onChange={v => setDraft({ ...draft, likely_exit_route: v as any })} options={ROUTES as readonly string[]} /></Field>
          <Field label="Next action (manual override)" full><Textarea value={(draft.next_action ?? target.next_action) ?? ""} onChange={e => setDraft({ ...draft, next_action: e.target.value })} placeholder={recommendNext(t, c)} /></Field>
          <Field label="Founder override notes" full><Textarea value={(draft.founder_override_notes ?? target.founder_override_notes) ?? ""} onChange={e => setDraft({ ...draft, founder_override_notes: e.target.value })} /></Field>
          <div className="flex items-center gap-2 md:col-span-3">
            <Checkbox checked={!!(draft.founder_approved ?? target.founder_approved)} onCheckedChange={v => setDraft({ ...draft, founder_approved: !!v })} id="fa" />
            <Label htmlFor="fa" className="text-xs">Founder approves this record (required before any external M&A action)</Label>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </CardContent>
      </Card>
    </PETLayout>
  );
}

function recommendNext(t: PortfolioExitTarget, c: { derived_exit_stage: string; sale_readiness_score: number }): string {
  if (t.current_active_customers < 10) return "Reach 10 paying customers to enter proof stage.";
  if (t.current_active_customers < 50) return "Push to 50 customers and document repeatability evidence.";
  if (t.current_active_customers < 100) return "Build evidence pack and reduce founder dependency before 100-customer milestone.";
  if (c.sale_readiness_score < 60) return "Strengthen margin, churn, evidence and AI-operation before approaching buyers.";
  return "Prepare adviser pack and shortlist of likely buyers — founder approval required to engage.";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "muted" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : "text-foreground";
  return <Card className="tech-card"><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className={`text-lg font-bold tabular-nums ${cls}`}>{value}</p></CardContent></Card>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-[11px] text-muted-foreground mb-1">{label}</p>{children}</div>;
}
function Line({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "muted" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : tone === "muted" ? "text-muted-foreground" : "";
  return <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">{label}</span><span className={`font-medium ${cls}`}>{value}</span></div>;
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "md:col-span-3" : ""}><Label className="text-[11px]">{label}</Label>{children}</div>;
}
function Num({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return <Input type="number" value={value == null ? "" : value} onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return <select className="w-full h-10 border border-input bg-background rounded-md px-2 text-sm" value={value} onChange={e => onChange(e.target.value)}>
    {options.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
  </select>;
}