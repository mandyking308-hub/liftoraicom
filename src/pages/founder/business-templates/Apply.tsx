import { useEffect, useState } from "react";
import { BTLayout, BTSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { applyTemplate, detectWrongTemplate, fetchTemplates, recommendTemplate, type TemplateRow } from "@/lib/businessTemplateFactory";
import { supabase } from "@/integrations/supabase/client";

export default function BTApply() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [archetypeCode, setArchetypeCode] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [recommended, setRecommended] = useState<TemplateRow | undefined>();
  const [enableRecommended, setEnableRecommended] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchTemplates().then(setTemplates).catch(() => {}); }, []);

  async function pullArchetype() {
    if (!businessId) return;
    const { data } = await supabase
      .from("business_archetype_assignments")
      .select("primary_archetype_id, business_archetypes:primary_archetype_id(archetype_code)")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const code = (data as any)?.business_archetypes?.archetype_code as string | undefined;
    if (code) {
      setArchetypeCode(code);
      const rec = recommendTemplate(templates, code);
      setRecommended(rec);
      if (rec) setSelected(rec.id);
      toast.success(`Archetype loaded: ${code}`);
    } else {
      toast.error("No archetype assignment found for that business");
    }
  }

  const chosen = templates.find(t => t.id === selected);
  const wrong = detectWrongTemplate({ archetype_code: archetypeCode, template: chosen });

  async function apply() {
    if (!businessId) return toast.error("Business ID required");
    if (!chosen) return toast.error("Choose a template");
    setBusy(true);
    try {
      const { application, tasks } = await applyTemplate({
        business_id: businessId, template: chosen, enable_recommended: enableRecommended, founder_confirmed: confirm,
      });
      toast.success(`Applied "${chosen.template_name}" — ${tasks.length} setup tasks created`);
    } catch (e: any) { toast.error(e.message ?? "Failed to apply"); }
    finally { setBusy(false); }
  }

  return (
    <BTLayout title="Apply template" subtitle="Pick a business, load its archetype, apply the matching operating template. Creates the live internal setup checklist; no external action.">
      <BTSection title="Target">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1 md:col-span-2"><Label>Business ID</Label><Input value={businessId} onChange={e => setBusinessId(e.target.value)} placeholder="00000000-..." /></div>
          <div className="flex items-end"><Button onClick={pullArchetype} variant="outline" size="sm" className="w-full">Load archetype</Button></div>
        </div>
        {archetypeCode && <p className="text-xs text-muted-foreground mt-2">Archetype: <Badge variant="outline" className="ml-1">{archetypeCode}</Badge>{recommended && <> · recommended template: <span className="text-primary">{recommended.template_name}</span></>}</p>}
      </BTSection>

      <BTSection title="Template">
        <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm"
          value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— choose a template —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.template_name} ({t.archetype_code})</option>)}
        </select>
        {wrong && <p className="text-xs text-yellow-400 mt-2">⚠ {wrong}</p>}
        {chosen && (
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <p>{chosen.required_modules.length} required modules · {chosen.required_agents.length} required agents · {chosen.required_kpis.length} KPIs · {chosen.required_documents.length} documents</p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={enableRecommended} onChange={e => setEnableRecommended(e.target.checked)} />Also enable recommended modules / agents</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />Founder confirm now</label>
          </div>
        )}
        <div className="pt-3">
          <Button size="sm" onClick={apply} disabled={busy || !chosen || !businessId}>Apply template (live internal)</Button>
        </div>
      </BTSection>
    </BTLayout>
  );
}