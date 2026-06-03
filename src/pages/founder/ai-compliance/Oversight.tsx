import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AICLayout, AICSection, EmptyState } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  fetchOversight, recordOversight, fetchSystems, fetchFlows, buildReviewPacket,
  type AIHumanOversightRecord, type AIComplianceSystem,
  type AIDataFlowRecord,
} from "@/lib/aiComplianceEngine";
import ReviewDialog from "@/components/founder/ai-compliance/ReviewDialog";
import type { ReviewPacketItem } from "@/lib/aiComplianceEngine";

function PacketGroup({ title, items, onReview }: { title: string; items: ReviewPacketItem[]; onReview: (s: AIComplianceSystem) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{title} · {items.length}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
            <tr>
              <th className="text-left p-2">System</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Ext-action</th>
              <th className="text-left p-2">Data-flow</th>
              <th className="text-left p-2">Oversight</th>
              <th className="text-left p-2">Confirmed</th>
              <th className="text-left p-2">Adviser</th>
              <th className="text-left p-2">Next safe action</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.system.id} className="border-b border-border/20">
                <td className="p-2 font-medium">{it.system.system_name}</td>
                <td className="p-2 text-muted-foreground">{it.system.risk_level}</td>
                <td className="p-2">{it.external_action ? "yes" : "no"}</td>
                <td className="p-2">{it.has_flow ? "ok" : "missing"}</td>
                <td className="p-2">{it.has_oversight ? "ok" : "missing"}</td>
                <td className="p-2">{it.founder_confirmed ? "yes" : "no"}</td>
                <td className="p-2">{it.needs_adviser ? "yes" : "no"}</td>
                <td className="p-2 text-muted-foreground">{it.next_safe_action}</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => onReview(it.system)}>Record founder review</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TYPES = ["founder_approval","human_review","escalation","kill_switch","override","rejection","manual_check"] as const;
const DECISIONS = ["approved","rejected","changed","escalated","parked"] as const;

function emptyDraft(): Partial<AIHumanOversightRecord> {
  return { oversight_type: "human_review", human_decision: "parked", external_action_blocked: false };
}

export default function AICOversight() {
  const [rows, setRows] = useState<AIHumanOversightRecord[]>([]);
  const [systems, setSystems] = useState<AIComplianceSystem[]>([]);
  const [flows, setFlows] = useState<AIDataFlowRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<AIHumanOversightRecord>>(emptyDraft());
  const [reviewSystem, setReviewSystem] = useState<AIComplianceSystem | null>(null);
  const [params] = useSearchParams();

  const load = () => {
    fetchOversight().then(setRows).catch(e => toast.error(e.message ?? "Failed"));
    fetchSystems().then(setSystems).catch(() => {});
    fetchFlows().then(setFlows).catch(() => {});
  };
  useEffect(load, []);

  const packet = buildReviewPacket({ systems, flows, oversight: rows });
  const showPacket = params.get("packet") === "1" || systems.length > 0;

  const save = async () => {
    if (!draft.oversight_type) return;
    try { await recordOversight(draft); toast.success("Logged"); setOpen(false); setDraft(emptyDraft()); load(); }
    catch (e: any) { toast.error(e.message ?? "Save failed"); }
  };

  return (
    <AICLayout title="Human Oversight & Intervention Log" subtitle="Every approval, rejection, override, escalation and kill-switch event.">
      {showPacket && (
        <AICSection
          title="Founder review packet"
          description="Review systems by priority. Record a founder review per system — default for high/critical or external-action systems is needs adviser."
        >
          <PacketGroup title="Priority 1 — External-action capable" items={packet.priority1_external_action} onReview={setReviewSystem} />
          <PacketGroup title="Priority 2 — Sensitive-data" items={packet.priority2_sensitive_data} onReview={setReviewSystem} />
          <PacketGroup title="Priority 3 — Internal AI control systems" items={packet.priority3_internal_control} onReview={setReviewSystem} />
        </AICSection>
      )}
      <ReviewDialog
        system={reviewSystem}
        open={!!reviewSystem}
        onOpenChange={(v) => { if (!v) setReviewSystem(null); }}
        onDone={load}
      />
      <AICSection title="Log" description={`${rows.length} events`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={() => setDraft(emptyDraft())}><Plus className="h-3 w-3 mr-1" /> Log event</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New oversight event</DialogTitle></DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={draft.oversight_type as string} onValueChange={v => setDraft({ ...draft, oversight_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Decision</Label>
                  <Select value={draft.human_decision as string} onValueChange={v => setDraft({ ...draft, human_decision: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DECISIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Linked system</Label>
                  <Select value={(draft.system_id as string) ?? "__none"} onValueChange={v => setDraft({ ...draft, system_id: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {systems.map(s => <SelectItem key={s.id} value={s.id}>{s.system_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Trigger source</Label><Input value={draft.trigger_source ?? ""} onChange={e => setDraft({ ...draft, trigger_source: e.target.value })} /></div>
                <div><Label>Trigger reason</Label><Input value={draft.trigger_reason ?? ""} onChange={e => setDraft({ ...draft, trigger_reason: e.target.value })} /></div>
              </div>
              <div><Label>Proposed AI action</Label><Textarea rows={2} value={draft.proposed_ai_action ?? ""} onChange={e => setDraft({ ...draft, proposed_ai_action: e.target.value })} /></div>
              <div><Label>Decision notes</Label><Textarea rows={2} value={draft.decision_notes ?? ""} onChange={e => setDraft({ ...draft, decision_notes: e.target.value })} /></div>
              <div><Label>Evidence URL</Label><Input value={draft.evidence_url ?? ""} onChange={e => setDraft({ ...draft, evidence_url: e.target.value })} /></div>
              <label className="flex items-center gap-2"><Checkbox checked={!!draft.external_action_blocked} onCheckedChange={v => setDraft({ ...draft, external_action_blocked: !!v })} /> External action blocked</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      }>
        {rows.length === 0 ? (
          <EmptyState title="No oversight events logged yet." hint="Log every founder approval, rejection, override or kill-switch decision." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Decision</th>
                  <th className="text-left p-2">Trigger</th>
                  <th className="text-left p-2">Proposed action</th>
                  <th className="text-left p-2">Blocked?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="p-2 font-mono text-[10px]">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.oversight_type.replace(/_/g," ")}</Badge></td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.human_decision}</Badge></td>
                    <td className="p-2 text-muted-foreground">{r.trigger_source ?? "—"} · {r.trigger_reason ?? ""}</td>
                    <td className="p-2 text-muted-foreground max-w-[260px] truncate">{r.proposed_ai_action ?? "—"}</td>
                    <td className="p-2">{r.external_action_blocked ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AICSection>
    </AICLayout>
  );
}