import { useEffect, useState } from "react";
import { EMLayout, EMSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchEntities, type LegalEntity } from "@/lib/entityMapEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EMEntities() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [form, setForm] = useState<Partial<LegalEntity>>({});
  const set = <K extends keyof LegalEntity>(k: K, v: LegalEntity[K]) => setForm(s => ({ ...s, [k]: v }));
  async function load() { setEntities(await fetchEntities()); }
  useEffect(() => { load().catch(() => {}); }, []);
  async function add() {
    if (!form.entity_name) return toast.error("Entity name required");
    const { error } = await supabase.from("legal_entities").insert({ ...form, entity_name: form.entity_name });
    if (error) return toast.error(error.message);
    toast.success("Entity added");
    setForm({});
    load();
  }
  return (
    <EMLayout title="Legal entities" subtitle="Catalogue of legal entities Liftor businesses can be mapped to.">
      <EMSection title="Add entity" description="Internal record only. No filings or registrar actions.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Field label="Entity name *"><Input value={form.entity_name ?? ""} onChange={e => set("entity_name", e.target.value)} /></Field>
          <Field label="Entity type"><Input value={form.entity_type ?? ""} onChange={e => set("entity_type", e.target.value)} placeholder="LLC / Ltd / FZ-LLC" /></Field>
          <Field label="Jurisdiction"><Input value={form.jurisdiction ?? ""} onChange={e => set("jurisdiction", e.target.value)} placeholder="UK / US-DE / AE-DUBAI" /></Field>
          <Field label="Registration # (summary)"><Input value={form.registration_number_summary ?? ""} onChange={e => set("registration_number_summary", e.target.value)} /></Field>
          <Field label="Owner summary"><Input value={form.owner_summary ?? ""} onChange={e => set("owner_summary", e.target.value)} /></Field>
          <Field label="Tax residency summary"><Input value={form.tax_residency_summary ?? ""} onChange={e => set("tax_residency_summary", e.target.value)} /></Field>
          <Field label="Financial year end"><Input value={form.financial_year_end ?? ""} onChange={e => set("financial_year_end", e.target.value)} placeholder="MM-DD" /></Field>
          <Field label="Accountant contact"><Input value={form.accountant_contact ?? ""} onChange={e => set("accountant_contact", e.target.value)} /></Field>
          <Field label="Legal contact"><Input value={form.legal_contact ?? ""} onChange={e => set("legal_contact", e.target.value)} /></Field>
        </div>
        <div className="pt-3"><Button size="sm" onClick={add}>Add entity</Button></div>
      </EMSection>

      <EMSection title={`Entities (${entities.length})`}>
        <div className="space-y-2">
          {entities.map(e => (
            <div key={e.id} className="border border-border/50 rounded p-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <div><p className="font-medium text-sm">{e.entity_name}</p><Badge variant="outline" className="text-[10px] mt-1">{e.entity_type ?? "—"}</Badge></div>
              <div><p className="text-muted-foreground">Jurisdiction</p><p>{e.jurisdiction ?? "—"}</p></div>
              <div><p className="text-muted-foreground">Tax residency</p><p>{e.tax_residency_summary ?? "—"}</p></div>
              <div><p className="text-muted-foreground">FYE / Accountant</p><p>{e.financial_year_end ?? "—"} · {e.accountant_contact ?? "—"}</p></div>
            </div>
          ))}
        </div>
      </EMSection>
    </EMLayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}