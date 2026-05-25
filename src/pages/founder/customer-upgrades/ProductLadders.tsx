import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CULayout, CUSection, CUEmpty, LADDER_TIERS, fmtMoney } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProductLadders() {
  const sb: any = supabase as any;
  const qc = useQueryClient();

  const { data: ladders = [] } = useQuery({
    queryKey: ["cu-ladders"],
    queryFn: async () => (await sb.from("product_upgrade_ladders").select("*").order("ladder_tier", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState({
    upgrade_name: "Core → Premium",
    ladder_tier: "premium",
    upgrade_reason: "Higher-tier customer profile fit",
    upgrade_trigger: "Customer asked about priority support and faster turnaround",
    price_difference: 1000,
    currency: "GBP",
    recommended_timing: "After third successful delivery",
    approved_pitch: "",
    prohibited_claims: "guaranteed results, no risk, instant ROI",
    requires_founder_approval: true,
    active: true,
  });

  const create = async () => {
    const { error } = await sb.from("product_upgrade_ladders").insert({
      ...form,
      prohibited_claims: form.prohibited_claims.split(",").map(s => s.trim()).filter(Boolean),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Ladder rung added");
    qc.invalidateQueries({ queryKey: ["cu-ladders"] });
  };

  const toggle = async (id: string, active: boolean) => {
    await sb.from("product_upgrade_ladders").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cu-ladders"] });
  };

  const grouped = LADDER_TIERS.reduce((acc: any, tier) => {
    acc[tier] = ladders.filter((l: any) => l.ladder_tier === tier);
    return acc;
  }, {});

  return (
    <CULayout title="Product Ladders" subtitle="Entry → Core → Premium → Subscription → Add-ons → Renewal → Human escalation. Liftor will never invent prices outside the ladder.">
      <CUSection title="Add ladder rung" description="Internal product map. Used to recommend upgrades — not to send any message.">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <Field label="Upgrade name"><Input value={form.upgrade_name} onChange={e => setForm({ ...form, upgrade_name: e.target.value })} /></Field>
          <Field label="Tier">
            <Select value={form.ladder_tier} onValueChange={v => setForm({ ...form, ladder_tier: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LADDER_TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Recommended timing"><Input value={form.recommended_timing} onChange={e => setForm({ ...form, recommended_timing: e.target.value })} /></Field>
          <Field label="Price difference"><Input type="number" value={form.price_difference} onChange={e => setForm({ ...form, price_difference: Number(e.target.value) })} /></Field>
          <Field label="Currency"><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} /></Field>
          <Field label="Requires founder approval">
            <div className="h-10 flex items-center"><Switch checked={form.requires_founder_approval} onCheckedChange={(v) => setForm({ ...form, requires_founder_approval: v })} /></div>
          </Field>
          <div className="md:col-span-3"><Field label="Upgrade reason"><Input value={form.upgrade_reason} onChange={e => setForm({ ...form, upgrade_reason: e.target.value })} /></Field></div>
          <div className="md:col-span-3"><Field label="Upgrade trigger"><Input value={form.upgrade_trigger} onChange={e => setForm({ ...form, upgrade_trigger: e.target.value })} /></Field></div>
          <div className="md:col-span-3"><Field label="Approved pitch (only language Liftor may use)"><Textarea rows={3} value={form.approved_pitch} onChange={e => setForm({ ...form, approved_pitch: e.target.value })} /></Field></div>
          <div className="md:col-span-3"><Field label="Prohibited claims (comma separated)"><Input value={form.prohibited_claims} onChange={e => setForm({ ...form, prohibited_claims: e.target.value })} /></Field></div>
        </div>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={create}>Add rung</Button></div>
      </CUSection>

      {LADDER_TIERS.map(tier => (
        <CUSection key={tier} title={tier.replace("_", " ")} description={`${grouped[tier].length} rung(s)`}>
          {grouped[tier].length === 0 ? <CUEmpty title="No rungs yet" /> : (
            <div className="space-y-2">
              {grouped[tier].map((l: any) => (
                <div key={l.id} className="rounded border border-border/50 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{l.upgrade_name}</span>
                    <Badge variant="outline">{fmtMoney(Number(l.price_difference || 0), l.currency)}</Badge>
                    {l.requires_founder_approval && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval required</Badge>}
                    <div className="ml-auto flex items-center gap-2"><span className="text-muted-foreground">Active</span><Switch checked={l.active} onCheckedChange={(v) => toggle(l.id, v)} /></div>
                  </div>
                  {l.upgrade_reason && <div><span className="text-muted-foreground">Reason: </span>{l.upgrade_reason}</div>}
                  {l.upgrade_trigger && <div><span className="text-muted-foreground">Trigger: </span>{l.upgrade_trigger}</div>}
                  {l.recommended_timing && <div><span className="text-muted-foreground">Timing: </span>{l.recommended_timing}</div>}
                  {l.approved_pitch && <div className="p-2 rounded bg-background/40 border border-border/40">{l.approved_pitch}</div>}
                  {Array.isArray(l.prohibited_claims) && l.prohibited_claims.length > 0 && (
                    <div className="text-destructive">Prohibited: {l.prohibited_claims.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CUSection>
      ))}
    </CULayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>;
}