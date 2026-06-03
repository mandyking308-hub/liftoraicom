import { useEffect, useState } from "react";
import { AICLayout, AICSection, EmptyState } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchFlows, upsertFlow, deleteFlow, fetchSystems,
  type AIDataFlowRecord, type AIComplianceSystem,
} from "@/lib/aiComplianceEngine";

const REVIEW = ["missing","draft","reviewed","approved","needs_adviser"] as const;

function emptyDraft(): Partial<AIDataFlowRecord> {
  return { source_system: "", destination_system: "", data_categories: [],
    personal_data: false, sensitive_data: false, children_data: false,
    cross_border_transfer: false, founder_confirmed: false, review_status: "draft" };
}

export default function AICDataFlows() {
  const [rows, setRows] = useState<AIDataFlowRecord[]>([]);
  const [systems, setSystems] = useState<AIComplianceSystem[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<AIDataFlowRecord>>(emptyDraft());

  const load = () => {
    fetchFlows().then(setRows).catch((e) => toast.error(e.message ?? "Failed"));
    fetchSystems().then(setSystems).catch(() => {});
  };
  useEffect(load, []);

  const save = async () => {
    if (!draft.source_system || !draft.destination_system) return toast.error("Source and destination are required");
    try { await upsertFlow(draft); toast.success("Saved"); setOpen(false); setDraft(emptyDraft()); load(); }
    catch (e: any) { toast.error(e.message ?? "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this data flow?")) return;
    try { await deleteFlow(id); load(); } catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  };

  return (
    <AICLayout title="Data Flow Register" subtitle="Where data moves between systems, what data, lawful basis and retention.">
      <AICSection title="Records" description={`${rows.length} flows recorded`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={() => setDraft(emptyDraft())}><Plus className="h-3 w-3 mr-1" /> Add flow</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New data flow</DialogTitle></DialogHeader>
            <Form draft={draft} setDraft={setDraft} systems={systems} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      }>
        {rows.length === 0 ? (
          <EmptyState title="No data flows registered." hint="Document every data path that personal, sensitive or business data takes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Flow</th>
                  <th className="text-left p-2">Categories</th>
                  <th className="text-left p-2">Personal</th>
                  <th className="text-left p-2">Sensitive</th>
                  <th className="text-left p-2">Cross-border</th>
                  <th className="text-left p-2">Lawful basis</th>
                  <th className="text-left p-2">Review</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{r.source_system} → {r.destination_system}</td>
                    <td className="p-2 text-muted-foreground">{(r.data_categories ?? []).join(", ") || "—"}</td>
                    <td className="p-2">{r.personal_data ? "yes" : "no"}</td>
                    <td className="p-2">{r.sensitive_data ? "yes" : "no"}</td>
                    <td className="p-2">{r.cross_border_transfer ? (r.transfer_jurisdiction ?? "yes") : "no"}</td>
                    <td className="p-2 text-muted-foreground">{r.lawful_basis ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.review_status}</Badge></td>
                    <td className="p-2 text-right"><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button></td>
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

function Form({ draft, setDraft, systems }: { draft: Partial<AIDataFlowRecord>; setDraft: (d: Partial<AIDataFlowRecord>) => void; systems: AIComplianceSystem[] }) {
  const u = (k: keyof AIDataFlowRecord, v: any) => setDraft({ ...draft, [k]: v });
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Source system</Label><Input value={draft.source_system ?? ""} onChange={e => u("source_system", e.target.value)} /></div>
        <div><Label>Destination system</Label><Input value={draft.destination_system ?? ""} onChange={e => u("destination_system", e.target.value)} /></div>
        <div className="col-span-2"><Label>Linked AI system (optional)</Label>
          <Select value={(draft.system_id as string) ?? "__none"} onValueChange={v => u("system_id", v === "__none" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              {systems.map(s => <SelectItem key={s.id} value={s.id}>{s.system_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Data categories (comma-separated)</Label>
          <Input value={(draft.data_categories ?? []).join(", ")} onChange={e => u("data_categories", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
        </div>
        <div><Label>Lawful basis</Label><Input value={draft.lawful_basis ?? ""} onChange={e => u("lawful_basis", e.target.value)} placeholder="contract / consent / legitimate interest" /></div>
        <div><Label>Retention period</Label><Input value={draft.retention_period ?? ""} onChange={e => u("retention_period", e.target.value)} placeholder="e.g. 12 months" /></div>
        <div><Label>Storage location</Label><Input value={draft.storage_location ?? ""} onChange={e => u("storage_location", e.target.value)} /></div>
        <div><Label>Transfer jurisdiction</Label><Input value={draft.transfer_jurisdiction ?? ""} onChange={e => u("transfer_jurisdiction", e.target.value)} /></div>
        <div><Label>Processor / controller note</Label><Input value={draft.processor_or_controller_note ?? ""} onChange={e => u("processor_or_controller_note", e.target.value)} /></div>
        <div><Label>Review status</Label>
          <Select value={draft.review_status as string} onValueChange={v => u("review_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REVIEW.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Security controls</Label><Textarea rows={2} value={draft.security_controls ?? ""} onChange={e => u("security_controls", e.target.value)} /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-border/40 rounded p-2">
        <label className="flex items-center gap-2"><Checkbox checked={!!draft.personal_data} onCheckedChange={v => u("personal_data", !!v)} /> Personal</label>
        <label className="flex items-center gap-2"><Checkbox checked={!!draft.sensitive_data} onCheckedChange={v => u("sensitive_data", !!v)} /> Sensitive</label>
        <label className="flex items-center gap-2"><Checkbox checked={!!draft.children_data} onCheckedChange={v => u("children_data", !!v)} /> Children</label>
        <label className="flex items-center gap-2"><Checkbox checked={!!draft.cross_border_transfer} onCheckedChange={v => u("cross_border_transfer", !!v)} /> Cross-border</label>
        <label className="flex items-center gap-2"><Checkbox checked={!!draft.founder_confirmed} onCheckedChange={v => u("founder_confirmed", !!v)} /> Founder-confirmed</label>
      </div>
    </div>
  );
}