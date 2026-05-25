import { useState } from "react";
import { BALayout, BASection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { classify, saveAssignment, type ClassifierInput, type ClassifierOutput } from "@/lib/businessArchetypeEngine";
import { toast } from "sonner";

const SELECTS: Record<string, string[]> = {
  revenue_model: ["subscription", "one_off", "usage", "retainer", "ads", "licensing", "rental", "lead", "mixed"],
  customer_type: ["b2b", "b2c", "both"],
  delivery_model: ["self_serve", "team", "physical", "content", "advisory", "platform", "on_site"],
  compliance_sensitivity: ["low", "medium", "high"],
};

export default function ArchetypeClassifier() {
  const [input, setInput] = useState<ClassifierInput>({ business_id: "" });
  const [output, setOutput] = useState<ClassifierOutput | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ClassifierInput>(k: K, v: ClassifierInput[K]) => setInput(s => ({ ...s, [k]: v }));

  const run = () => setOutput(classify(input));
  const save = async (confirm: boolean) => {
    if (!input.business_id) return toast.error("Business ID required");
    if (!output) return toast.error("Run classifier first");
    setSaving(true);
    try {
      await saveAssignment({ business_id: input.business_id, output, founder_confirmed: confirm });
      toast.success(confirm ? "Assignment saved and confirmed" : "Assignment saved as draft");
    } catch (e: any) { toast.error(e.message ?? "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <BALayout title="Classifier" subtitle="Inspect business signals → primary archetype, secondaries, confidence, reason, missing info, recommended setup tasks. Internal-only; no external action.">
      <BASection title="Inputs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="space-y-1"><Label>Business ID (uuid)</Label><Input value={input.business_id} onChange={e => set("business_id", e.target.value)} placeholder="00000000-0000-0000-0000-..." /></div>
          <div className="space-y-1"><Label>Business name</Label><Input value={input.name ?? ""} onChange={e => set("name", e.target.value)} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Description</Label><Textarea rows={3} value={input.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Manual / uploaded context (paste)</Label><Textarea rows={3} value={input.manual_text ?? ""} onChange={e => set("manual_text", e.target.value)} /></div>
          <div className="space-y-1"><Label>Website</Label><Input value={input.website ?? ""} onChange={e => set("website", e.target.value)} /></div>
          <div className="space-y-1"><Label>Products / services</Label><Input value={input.products ?? ""} onChange={e => set("products", e.target.value)} /></div>
          {(Object.entries(SELECTS) as [keyof ClassifierInput, string[]][]).map(([k, opts]) => (
            <div key={String(k)} className="space-y-1">
              <Label className="capitalize">{String(k).replaceAll("_", " ")}</Label>
              <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm"
                value={(input as any)[k] ?? ""} onChange={e => set(k as any, (e.target.value || undefined) as any)}>
                <option value="">—</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!input.has_supply_side} onChange={e => set("has_supply_side", e.target.checked)} />Has seller/supplier side</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!input.ip_heavy} onChange={e => set("ip_heavy", e.target.checked)} />IP / licensing heavy</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!input.local_only} onChange={e => set("local_only", e.target.checked)} />Local-only operation</label>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={run} size="sm">Run classifier</Button>
          <Button onClick={() => save(false)} disabled={saving || !output} size="sm" variant="outline">Save draft</Button>
          <Button onClick={() => save(true)} disabled={saving || !output} size="sm" variant="default">Founder confirm & save</Button>
        </div>
      </BASection>

      {output && (
        <BASection title="Output">
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/30">Primary: {output.primary}</Badge>
              {output.secondaries.map(s => <Badge key={s} variant="outline">2°: {s}</Badge>)}
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Confidence: {(output.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{output.reason}</p>
            {output.missing_information.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Missing information</p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {output.missing_information.map(m => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}
            <div>
              <p className="text-xs font-medium mb-1">Recommended setup tasks</p>
              <ul className="list-disc pl-5 text-xs">
                {output.recommended_setup_tasks.map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
        </BASection>
      )}
    </BALayout>
  );
}