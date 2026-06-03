import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DRLayout, Stat } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchOpportunity, upsertOpportunity,
  fetchFinancing, upsertFinancing, deleteFinancing,
  ACTION_LABEL, STRUCTURE_LABEL, fmtMoney,
  type AcquisitionOpportunity, type FinancingOption, type RecommendedStructure,
} from "@/lib/distressedRadarEngine";

const CATEGORIES = ["saas","ai","ecommerce","agency","app","marketplace","content","domain","brand","trademark","ip","distressed_retail","other"];
const DISTRESS = ["founder_exhausted","cash_shortage","liquidation","administration","bankruptcy","revenue_decline","overbuilt_no_sales","codebase_only","brand_ip_sale","turnaround","unknown"];
const STRUCTURES: RecommendedStructure[] = ["cash_purchase","seller_finance","earn_out","revenue_share","spv","investor_partner","debt","do_not_buy"];

export default function DRAcquisitionDetail() {
  const { id } = useParams();
  const [o, setO] = useState<AcquisitionOpportunity | null>(null);
  const [fin, setFin] = useState<FinancingOption[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    fetchOpportunity(id).then(setO).catch(() => {});
    fetchFinancing(id).then(setFin).catch(() => {});
  };
  useEffect(load, [id]);

  if (!o) return <DRLayout title="Loading…"><p className="text-sm text-muted-foreground">Loading opportunity…</p></DRLayout>;

  const set = <K extends keyof AcquisitionOpportunity>(k: K, v: AcquisitionOpportunity[K]) => setO({ ...o, [k]: v });

  async function save() {
    if (!o) return;
    setSaving(true);
    try {
      const saved = await upsertOpportunity(o);
      setO(saved);
    } finally { setSaving(false); }
  }

  async function addStructure(structure: RecommendedStructure) {
    if (!o) return;
    await upsertFinancing({ opportunity_id: o.id, structure, recommended: false });
    load();
  }

  return (
    <DRLayout title={o.opportunity_name} subtitle="Internal research record. Founder approval is required for every external action.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Priority" value={o.overall_priority_score ?? "—"} accent="emerald" />
        <Stat label="Liftor fit" value={o.liftor_fit_score ?? "—"} />
        <Stat label="Legal risk" value={o.legal_risk_score ?? "—"} accent={(o.legal_risk_score ?? 0) >= 50 ? "rose" : undefined} />
        <Stat label="Financing feasibility" value={o.financing_feasibility_score ?? "—"} />
        <Stat label="Brand value" value={o.brand_value_score ?? "—"} />
        <Stat label="Replacement cost" value={o.replacement_cost_score ?? "—"} />
        <Stat label="Turnaround" value={o.turnaround_score ?? "—"} />
        <Stat label="Exit route" value={o.exit_route_score ?? "—"} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline">{ACTION_LABEL[o.recommended_action]}</Badge>
        <Badge variant="outline">{STRUCTURE_LABEL[o.recommended_structure]}</Badge>
        {o.founder_approval_required && !o.founder_approved && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Awaiting founder approval</Badge>}
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Edit opportunity</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 text-xs">
          <Field label="Name"><Input value={o.opportunity_name} onChange={e => set("opportunity_name", e.target.value)} /></Field>
          <Field label="Source"><Input value={o.source ?? ""} onChange={e => set("source", e.target.value)} /></Field>
          <Field label="Source URL"><Input value={o.source_url ?? ""} onChange={e => set("source_url", e.target.value)} /></Field>
          <Field label="Country"><Input value={o.country ?? ""} onChange={e => set("country", e.target.value)} /></Field>
          <Field label="Category">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs" value={o.category} onChange={e => set("category", e.target.value as AcquisitionOpportunity["category"])}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Distress type">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs" value={o.distress_type} onChange={e => set("distress_type", e.target.value as AcquisitionOpportunity["distress_type"])}>
              {DISTRESS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Asking price"><Input type="number" value={o.asking_price ?? ""} onChange={e => set("asking_price", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Revenue TTM"><Input type="number" value={o.revenue_ttm ?? ""} onChange={e => set("revenue_ttm", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Profit TTM"><Input type="number" value={o.profit_ttm ?? ""} onChange={e => set("profit_ttm", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="MRR"><Input type="number" value={o.monthly_recurring_revenue ?? ""} onChange={e => set("monthly_recurring_revenue", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="ARR"><Input type="number" value={o.annual_recurring_revenue ?? ""} onChange={e => set("annual_recurring_revenue", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Customers"><Input type="number" value={o.customer_count ?? ""} onChange={e => set("customer_count", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Users"><Input type="number" value={o.user_count ?? ""} onChange={e => set("user_count", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Email list"><Input type="number" value={o.email_list_size ?? ""} onChange={e => set("email_list_size", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Social following"><Input type="number" value={o.social_following ?? ""} onChange={e => set("social_following", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Domain strength (0-100)"><Input type="number" value={o.domain_strength ?? ""} onChange={e => set("domain_strength", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Trademark status">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs" value={o.trademark_status ?? "unknown"} onChange={e => set("trademark_status", e.target.value)}>
              {["registered","pending","unknown","none"].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="IP assets"><Input value={o.ip_assets ?? ""} onChange={e => set("ip_assets", e.target.value)} /></Field>
          <Field label="Code assets"><Input value={o.code_assets ?? ""} onChange={e => set("code_assets", e.target.value)} /></Field>
          <Field label="Customer data status">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs" value={o.customer_data_status ?? "unknown"} onChange={e => set("customer_data_status", e.target.value)}>
              {["clean","partial","unknown","missing"].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Operational complexity (0-100)"><Input type="number" value={o.operational_complexity ?? ""} onChange={e => set("operational_complexity", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Founder dependency (0-100)"><Input type="number" value={o.founder_dependency ?? ""} onChange={e => set("founder_dependency", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="Financing required"><Input type="number" value={o.financing_required ?? ""} onChange={e => set("financing_required", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <div className="md:col-span-3"><Field label="Liftor operating advantage (required for any 'acquire' recommendation)">
            <Textarea value={o.liftor_advantage_notes ?? ""} onChange={e => set("liftor_advantage_notes", e.target.value)} rows={2} />
          </Field></div>
          <div className="md:col-span-3"><Field label="Notes"><Textarea value={o.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} /></Field></div>
          <Field label="Next action"><Input value={o.next_action ?? ""} onChange={e => set("next_action", e.target.value)} /></Field>
          <Field label="Founder approval required">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs" value={o.founder_approval_required ? "yes" : "no"} onChange={e => set("founder_approval_required", e.target.value === "yes")}>
              <option value="yes">Yes</option><option value="no">No</option>
            </select>
          </Field>
          <Field label="Founder approved">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs" value={o.founder_approved ? "yes" : "no"} onChange={e => set("founder_approved", e.target.value === "yes")}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </Field>
          <div className="md:col-span-3 flex gap-2 justify-end">
            <Link to="/founder/distressed-radar/acquisition" className="text-xs text-muted-foreground hover:text-primary self-center">Back</Link>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & rescore"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Financing options</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex flex-wrap gap-1">
            {STRUCTURES.map(s => (
              <Button key={s} size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => addStructure(s)}>+ {STRUCTURE_LABEL[s]}</Button>
            ))}
          </div>
          {fin.length === 0 && <p className="text-muted-foreground">No financing options added yet.</p>}
          {fin.map(f => (
            <div key={f.id} className="flex items-center gap-2 border-b border-border/30 py-1">
              <Badge variant="outline" className="text-[10px]">{STRUCTURE_LABEL[f.structure]}</Badge>
              <span className="text-muted-foreground">capital {fmtMoney(f.estimated_capital)}</span>
              <span className="text-muted-foreground">term {f.estimated_term_months ?? "—"}m</span>
              <span className="flex-1 truncate">{f.notes}</span>
              <button onClick={async () => { await deleteFinancing(f.id); load(); }} className="text-muted-foreground hover:text-rose-400 text-[10px]">remove</button>
            </div>
          ))}
        </CardContent>
      </Card>
    </DRLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>{children}</div>;
}