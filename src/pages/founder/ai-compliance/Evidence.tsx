import { useEffect, useState } from "react";
import { AICLayout, AICSection, EmptyState } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  fetchEvidence, upsertEvidence, fetchSystems, fetchOversight, fetchFlows,
  rollupEvidence,
  type AIComplianceEvidenceItem, type AIComplianceSystem,
} from "@/lib/aiComplianceEngine";

const TYPES = ["policy","technical_manual","user_manual","audit_log","approval_log","data_flow","risk_assessment","vendor_record","incident_record","test_result","screenshot","export","other"] as const;
const REVIEW = ["missing","draft","current","stale","adviser_review_required"] as const;

const STATUS_CLS: Record<string, string> = {
  current: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  draft: "bg-primary/15 text-primary border-primary/30",
  stale: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  missing: "bg-destructive/15 text-destructive border-destructive/30",
  adviser_review_required: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

export default function AICEvidence() {
  const [rows, setRows] = useState<AIComplianceEvidenceItem[]>([]);
  const [systems, setSystems] = useState<AIComplianceSystem[]>([]);
  const [counts, setCounts] = useState({ oversight: 0, flows: 0 });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<AIComplianceEvidenceItem>>({ evidence_type: "policy", review_status: "draft", title: "" });

  const load = () => {
    fetchEvidence().then(setRows).catch(e => toast.error(e.message ?? "Failed"));
    fetchSystems().then(setSystems).catch(() => {});
    fetchOversight().then(o => setCounts(c => ({ ...c, oversight: o.length }))).catch(() => {});
    fetchFlows().then(f => setCounts(c => ({ ...c, flows: f.length }))).catch(() => {});
  };
  useEffect(load, []);

  const save = async () => {
    if (!draft.title) return toast.error("Title required");
    try { await upsertEvidence(draft); toast.success("Saved"); setOpen(false); load(); }
    catch (e: any) { toast.error(e.message ?? "Save failed"); }
  };

  return (
    <AICLayout title="Evidence Pack" subtitle="Adviser/buyer diligence-ready evidence index. Export not yet enabled.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Card label="Systems inventoried" value={systems.length} />
        <Card label="Data flows recorded" value={counts.flows} />
        <Card label="Oversight events" value={counts.oversight} />
        <Card label="Evidence items" value={rows.length} />
      </div>

      <AICSection title="Evidence roll-up" description="Coverage across the categories Liftor evidences. Empty categories show ‘Not available yet’ — no fake records.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {rollupEvidence(rows).map(r => (
            <div key={r.category} className="rounded border border-border/50 p-2 bg-background/40 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.label}</p>
                {r.missing ? (
                  <p className="text-[10px] text-muted-foreground">Not available yet</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{r.count} items · {r.current} current{r.stale ? ` · ${r.stale} stale` : ""}</p>
                )}
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${r.missing ? "bg-destructive/15 text-destructive border-destructive/30" : r.current > 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
                {r.missing ? "missing" : r.current > 0 ? "current" : "review"}
              </Badge>
            </div>
          ))}
        </div>
      </AICSection>

      <AICSection title="Evidence index" description={`${rows.length} items · ${rows.filter(r => r.review_status === "current").length} current`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Add evidence</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New evidence item</DialogTitle></DialogHeader>
            <div className="space-y-3 text-xs">
              <div><Label>Title</Label><Input value={draft.title ?? ""} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={draft.evidence_type as string} onValueChange={v => setDraft({ ...draft, evidence_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Review status</Label>
                  <Select value={draft.review_status as string} onValueChange={v => setDraft({ ...draft, review_status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REVIEW.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Source module</Label><Input value={draft.source_module ?? ""} onChange={e => setDraft({ ...draft, source_module: e.target.value })} /></div>
                <div><Label>Source table</Label><Input value={draft.source_table ?? ""} onChange={e => setDraft({ ...draft, source_table: e.target.value })} /></div>
                <div><Label>Owner</Label><Input value={draft.owner ?? ""} onChange={e => setDraft({ ...draft, owner: e.target.value })} /></div>
                <div><Label>Next review</Label><Input type="date" value={(draft.next_review_due_at ?? "").slice(0,10)} onChange={e => setDraft({ ...draft, next_review_due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              </div>
              <div><Label>Summary</Label><Textarea rows={2} value={draft.summary ?? ""} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      }>
        {rows.length === 0 ? (
          <EmptyState title="No evidence items linked yet." hint="Link policies, audit logs, approval logs, data flows, vendor records and risk assessments." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Owner</th>
                  <th className="text-left p-2">Next review</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{r.title}<div className="text-[10px] text-muted-foreground">{r.summary ?? ""}</div></td>
                    <td className="p-2 text-muted-foreground">{r.evidence_type.replace(/_/g," ")}</td>
                    <td className="p-2 text-muted-foreground">{r.source_module ?? "—"}{r.source_table ? `:${r.source_table}` : ""}</td>
                    <td className="p-2 text-muted-foreground">{r.owner ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{r.next_review_due_at ? new Date(r.next_review_due_at).toLocaleDateString() : "—"}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${STATUS_CLS[r.review_status] ?? "border-border/50"}`}>{r.review_status.replace(/_/g," ")}</Badge></td>
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

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="tech-card border border-border/50 rounded p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}