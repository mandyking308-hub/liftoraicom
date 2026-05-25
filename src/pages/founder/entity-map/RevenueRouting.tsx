import { useEffect, useState } from "react";
import { EMLayout, EMSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchEntities, fetchRoutingRules, type LegalEntity, type RevenueRoutingRule } from "@/lib/entityMapEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REVENUE_TYPES = ["product","service","subscription","marketplace_fee","commission","licence","consulting","other"] as const;

export default function EMRevenueRouting() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [rules, setRules] = useState<RevenueRoutingRule[]>([]);
  const [form, setForm] = useState<Partial<RevenueRoutingRule>>({ adviser_review_required: true, active: true, revenue_type: "subscription" });
  const set = <K extends keyof RevenueRoutingRule>(k: K, v: RevenueRoutingRule[K]) => setForm(s => ({ ...s, [k]: v }));
  async function load() {
    setEntities(await fetchEntities()); setRules(await fetchRoutingRules());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function add() {
    if (!form.business_id) return toast.error("Business ID required");
    const { error } = await supabase.from("revenue_routing_rules").insert({
      business_id: form.business_id,
      legal_entity_id: form.legal_entity_id ?? null,
      revenue_type: form.revenue_type ?? "other",
      route_to_entity: form.route_to_entity ?? null,
      route_to_bank_summary: form.route_to_bank_summary ?? null,
      tax_notes: form.tax_notes ?? null,
      adviser_review_required: form.adviser_review_required ?? true,
      active: form.active ?? true,
    });
    if (error) return toast.error(error.message);
    toast.success("Routing rule saved (internal). Adviser review required by default.");
    setForm({ adviser_review_required: true, active: true, revenue_type: "subscription" });
    load();
  }

  return (
    <EMLayout title="Revenue routing" subtitle="Per-business per-revenue-stream routing notes. No bank instructions sent. Every rule defaults to adviser review.">
      <EMSection title="Add routing rule">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Field label="Business ID *"><Input value={form.business_id ?? ""} onChange={e => set("business_id", e.target.value)} /></Field>
          <Field label="Legal entity">
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm"
              value={form.legal_entity_id ?? ""} onChange={e => set("legal_entity_id", (e.target.value || null) as any)}>
              <option value="">—</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.entity_name}</option>)}
            </select>
          </Field>
          <Field label="Revenue type">
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm"
              value={form.revenue_type} onChange={e => set("revenue_type", e.target.value as any)}>
              {REVENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Route to entity (label)"><Input value={form.route_to_entity ?? ""} onChange={e => set("route_to_entity", e.target.value)} /></Field>
          <Field label="Route to bank (summary)"><Input value={form.route_to_bank_summary ?? ""} onChange={e => set("route_to_bank_summary", e.target.value)} placeholder="UK GBP, US USD, AE AED" /></Field>
          <Field label="Tax notes (internal)"><Textarea rows={2} value={form.tax_notes ?? ""} onChange={e => set("tax_notes", e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-xs mt-2">
          <input type="checkbox" checked={!!form.adviser_review_required} onChange={e => set("adviser_review_required", e.target.checked)} />
          Adviser review required
        </label>
        <div className="pt-3"><Button size="sm" onClick={add}>Save rule</Button></div>
      </EMSection>

      <EMSection title={`Routing rules (${rules.length})`}>
        {rules.length === 0 ? <p className="text-sm text-muted-foreground">No rules yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-2">Business</th><th className="py-1 pr-2">Type</th><th className="py-1 pr-2">Entity</th>
                  <th className="py-1 pr-2">Bank</th><th className="py-1 pr-2">Tax notes</th><th className="py-1 pr-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-t border-border/30">
                    <td className="py-1 pr-2 font-mono text-[10px]">{r.business_id.slice(0, 8)}…</td>
                    <td className="py-1 pr-2"><Badge variant="outline" className="text-[10px]">{r.revenue_type}</Badge></td>
                    <td className="py-1 pr-2">{entities.find(e => e.id === r.legal_entity_id)?.entity_name ?? r.route_to_entity ?? "—"}</td>
                    <td className="py-1 pr-2">{r.route_to_bank_summary ?? "—"}</td>
                    <td className="py-1 pr-2">{r.tax_notes ?? "—"}</td>
                    <td className="py-1 pr-2">
                      {r.adviser_review_required && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">Adviser review</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EMSection>
    </EMLayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}