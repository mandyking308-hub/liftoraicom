import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CULayout, CUSection, CUEmpty, OPP_STATUS_TONE, OPP_TYPES, fmtMoney } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS = ["new", "watch", "approval_required", "approved", "contacted", "won", "lost", "parked"];

export default function UpgradeOpportunities() {
  const sb: any = supabase as any;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: opps = [] } = useQuery({
    queryKey: ["cu-opportunities", filter],
    queryFn: async () => {
      let q = sb.from("customer_upgrade_opportunities").select("*").order("urgency_score", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      return (await q).data ?? [];
    },
  });

  const [form, setForm] = useState({
    contact_id: "",
    opportunity_type: "upsell",
    trigger_reason: "Customer asked about premium features",
    customer_signal: "buying_signal",
    estimated_value: 500,
    probability_score: 0.4,
    urgency_score: 0.5,
    recommended_pitch: "",
    next_best_action: "Schedule founder review then prepare upgrade offer",
  });

  const create = async () => {
    if (!form.contact_id) { toast.error("Contact ID required"); return; }
    const { error } = await sb.from("customer_upgrade_opportunities").insert({
      ...form,
      status: "new",
      approval_required: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Opportunity logged");
    qc.invalidateQueries({ queryKey: ["cu-opportunities"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };

  const setStatus = async (id: string, status: string) => {
    if (status === "won") {
      toast.warning("Won requires verified payment / subscription / contract event. Marking as 'won' should only follow confirmation.");
    }
    await sb.from("customer_upgrade_opportunities").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cu-opportunities"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };

  return (
    <CULayout title="Upgrade Opportunities" subtitle="Live queue of customer upgrade signals. External contact remains locked until approved.">
      <CUSection title="Filter">
        <div className="flex flex-wrap gap-2 text-xs">
          {["all", ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-2 py-1 rounded border ${filter === s ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-secondary"}`}>
              {s}
            </button>
          ))}
        </div>
      </CUSection>

      <CUSection title="Log internal opportunity" description="Internal record only. No customer message is sent.">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <Field label="Contact ID"><Input value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} placeholder="uuid" /></Field>
          <Field label="Type">
            <Select value={form.opportunity_type} onValueChange={v => setForm({ ...form, opportunity_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OPP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Customer signal"><Input value={form.customer_signal} onChange={e => setForm({ ...form, customer_signal: e.target.value })} /></Field>
          <Field label="Estimated value"><Input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: Number(e.target.value) })} /></Field>
          <Field label="Probability (0-1)"><Input type="number" step="0.05" value={form.probability_score} onChange={e => setForm({ ...form, probability_score: Number(e.target.value) })} /></Field>
          <Field label="Urgency (0-1)"><Input type="number" step="0.05" value={form.urgency_score} onChange={e => setForm({ ...form, urgency_score: Number(e.target.value) })} /></Field>
          <div className="md:col-span-3"><Field label="Trigger reason"><Input value={form.trigger_reason} onChange={e => setForm({ ...form, trigger_reason: e.target.value })} /></Field></div>
          <div className="md:col-span-3"><Field label="Recommended pitch (internal draft only)"><Textarea rows={2} value={form.recommended_pitch} onChange={e => setForm({ ...form, recommended_pitch: e.target.value })} /></Field></div>
          <div className="md:col-span-3"><Field label="Next best action"><Input value={form.next_best_action} onChange={e => setForm({ ...form, next_best_action: e.target.value })} /></Field></div>
        </div>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={create}>Log opportunity</Button></div>
      </CUSection>

      <CUSection title={`Opportunities (${opps.length})`}>
        {opps.length === 0 ? <CUEmpty title="No opportunities match filter" /> : (
          <div className="space-y-2">
            {opps.map((o: any) => (
              <div key={o.id} className="rounded border border-border/50 p-3 text-xs space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{o.opportunity_type}</Badge>
                  <Badge variant="outline" className={OPP_STATUS_TONE[o.status] ?? ""}>{o.status}</Badge>
                  <span className="font-semibold">{fmtMoney(Number(o.estimated_value || 0), o.currency)}</span>
                  <span className="text-muted-foreground">Prob {(Number(o.probability_score) * 100).toFixed(0)}%</span>
                  <span className="text-muted-foreground">Urg {(Number(o.urgency_score) * 100).toFixed(0)}%</span>
                  {o.approval_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval required</Badge>}
                  <span className="ml-auto text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                </div>
                {o.trigger_reason && <div><span className="text-muted-foreground">Trigger: </span>{o.trigger_reason}</div>}
                {o.recommended_pitch && <div className="p-2 rounded bg-background/40 border border-border/40"><span className="text-muted-foreground">Pitch draft: </span>{o.recommended_pitch}</div>}
                {o.next_best_action && <div><span className="text-muted-foreground">Next: </span>{o.next_best_action}</div>}
                <div className="flex flex-wrap gap-1 pt-1">
                  {STATUS_OPTIONS.map(s => (
                    <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setStatus(o.id, s)}>{s}</Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CUSection>
    </CULayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>;
}