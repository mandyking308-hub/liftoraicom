import { useEffect, useState } from "react";
import { AICLayout, AICSection, RiskBadge, StatusBadge, EmptyState } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSystems, upsertSystem, deleteSystem, classifyRisk,
  type AIComplianceSystem, type AutonomyLevel, type SystemType, type SystemStatus,
} from "@/lib/aiComplianceEngine";

const SYSTEM_TYPES: SystemType[] = ["agent","workflow","gateway","model_route","connector","automation","analytics","content_generation","outreach","support","finance","legal_tax","other"];
const AUTONOMY: AutonomyLevel[] = ["assistive","recommend_only","draft_only","approval_required","semi_autonomous","autonomous_internal","external_action_capable"];
const STATUSES: SystemStatus[] = ["live","paused","blocked","retired","under_review"];

function emptyDraft(): Partial<AIComplianceSystem> {
  return {
    system_name: "", system_type: "agent", internal_or_external: "internal",
    autonomy_level: "recommend_only", current_status: "under_review",
    risk_level: "medium", founder_confirmed: false,
    uses_personal_data: false, uses_sensitive_data: false,
    handles_children_data: false, handles_health_data: false,
    handles_financial_data: false, handles_legal_data: false,
    external_action_capable: false,
  };
}

export default function AICSystems() {
  const [rows, setRows] = useState<AIComplianceSystem[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<AIComplianceSystem>>(emptyDraft());

  const load = () => { fetchSystems().then(setRows).catch((e) => toast.error(e.message ?? "Failed to load")); };
  useEffect(load, []);

  const save = async () => {
    if (!draft.system_name) return toast.error("System name is required");
    try {
      const classified = classifyRisk(draft as AIComplianceSystem);
      await upsertSystem({ ...draft, risk_level: classified.level });
      toast.success("Saved");
      setOpen(false); setDraft(emptyDraft()); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this system entry?")) return;
    try { await deleteSystem(id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  };

  return (
    <AICLayout title="AI System Inventory" subtitle="Every AI system, agent, workflow, gateway, model route, connector or automation in use.">
      <AICSection title="Inventory" description={`${rows.length} systems recorded`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setDraft(emptyDraft())}><Plus className="h-3 w-3 mr-1" /> Add system</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New AI system</DialogTitle></DialogHeader>
            <SystemForm draft={draft} setDraft={setDraft} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      }>
        {rows.length === 0 ? (
          <EmptyState title="No AI systems inventoried yet."
            hint="Add every agent, workflow, gateway, connector or automation in use — internal or external." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Autonomy</th>
                  <th className="text-left p-2">Risk</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">External</th>
                  <th className="text-left p-2">Confirmed</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{r.system_name}<div className="text-[10px] text-muted-foreground">{r.provider ?? ""}</div></td>
                    <td className="p-2 text-muted-foreground">{r.system_type}</td>
                    <td className="p-2 text-muted-foreground">{r.autonomy_level.replace(/_/g, " ")}</td>
                    <td className="p-2"><RiskBadge level={r.risk_level} /></td>
                    <td className="p-2"><StatusBadge status={r.current_status} /></td>
                    <td className="p-2">{r.external_action_capable ? "yes" : "no"}</td>
                    <td className="p-2">{r.founder_confirmed ? "yes" : "no"}</td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
                    </td>
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

function SystemForm({ draft, setDraft }: { draft: Partial<AIComplianceSystem>; setDraft: (d: Partial<AIComplianceSystem>) => void }) {
  const u = (k: keyof AIComplianceSystem, v: any) => setDraft({ ...draft, [k]: v });
  const bool = (k: keyof AIComplianceSystem, label: string) => (
    <label className="flex items-center gap-2 text-xs">
      <Checkbox checked={!!(draft as any)[k]} onCheckedChange={v => u(k, !!v)} />
      <span>{label}</span>
    </label>
  );
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>System name</Label><Input value={draft.system_name ?? ""} onChange={e => u("system_name", e.target.value)} /></div>
        <div><Label>Provider</Label><Input value={draft.provider ?? ""} onChange={e => u("provider", e.target.value)} placeholder="OpenAI, Lovable AI, internal…" /></div>
        <div><Label>Type</Label>
          <Select value={draft.system_type as string} onValueChange={v => u("system_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SYSTEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Autonomy</Label>
          <Select value={draft.autonomy_level as string} onValueChange={v => u("autonomy_level", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{AUTONOMY.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={draft.current_status as string} onValueChange={v => u("current_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Internal / external</Label>
          <Select value={draft.internal_or_external as string} onValueChange={v => u("internal_or_external", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">internal</SelectItem>
              <SelectItem value="external">external</SelectItem>
              <SelectItem value="mixed">mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Owner role</Label><Input value={draft.owner_role ?? ""} onChange={e => u("owner_role", e.target.value)} /></div>
        <div><Label>Business ID (optional)</Label><Input value={draft.business_id ?? ""} onChange={e => u("business_id", e.target.value || null)} /></div>
      </div>
      <div><Label>Purpose</Label><Textarea rows={2} value={draft.purpose ?? ""} onChange={e => u("purpose", e.target.value)} /></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 border border-border/40 rounded p-2">
        {bool("uses_personal_data", "Uses personal data")}
        {bool("uses_sensitive_data", "Uses sensitive data")}
        {bool("handles_children_data", "Handles children's data")}
        {bool("handles_health_data", "Handles health data")}
        {bool("handles_financial_data", "Handles financial data")}
        {bool("handles_legal_data", "Handles legal data")}
        {bool("external_action_capable", "External action capable")}
        {bool("founder_confirmed", "Founder-confirmed")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Last reviewed</Label><Input type="date" value={(draft.last_reviewed_at ?? "").slice(0,10)} onChange={e => u("last_reviewed_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
        <div><Label>Next review due</Label><Input type="date" value={(draft.next_review_due_at ?? "").slice(0,10)} onChange={e => u("next_review_due_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
      </div>
      <div><Label>Notes</Label><Textarea rows={2} value={draft.notes ?? ""} onChange={e => u("notes", e.target.value)} /></div>
    </div>
  );
}