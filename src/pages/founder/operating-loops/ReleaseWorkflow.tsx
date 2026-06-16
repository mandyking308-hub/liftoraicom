import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { approveRelease, createRelease, fetchReleases, RELEASE_STATUSES, RELEASE_TYPES, updateRelease, type ReleaseItem } from "@/lib/operatingLoops/releaseWorkflowEngine";
import { toast } from "sonner";
import { markReleaseCommsReadyForReview } from "@/lib/lifecycleHandoffs";

export default function ReleaseWorkflowPage() {
  const [rows, setRows] = useState<ReleaseItem[]>([]);
  const [title, setTitle] = useState(""); const [type, setType] = useState<string>("feature");
  const reload = () => fetchReleases().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { reload(); }, []);

  const add = async () => { if (!title.trim()) return; try { await createRelease({ release_title: title.trim(), release_type: type }); setTitle(""); reload(); } catch (e: any) { toast.error(e.message); } };
  const setStatus = async (id: string, status: string) => { try { await updateRelease(id, { release_status: status }); reload(); } catch (e: any) { toast.error(e.message); } };

  return (
    <OLLayout title="Release workflow"
      subtitle="Roadmap → build → QA → founder review → approved → released. Draft customer comms only — nothing is sent."
      disclaimer="No automatic customer notifications. No external publishing. Drafts only.">
      <OLSection title="Add release item">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Release title" value={title} onChange={e => setTitle(e.target.value)} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{RELEASE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add}>Add</Button>
        </div>
      </OLSection>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {RELEASE_STATUSES.map(st => (
          <OLSection key={st} title={`${st.replace(/_/g," ")} (${rows.filter(r => r.release_status === st).length})`}>
            {rows.filter(r => r.release_status === st).map(r => (
              <div key={r.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div><span className="font-medium">{r.release_title}</span> <span className="text-muted-foreground">· {r.release_type}</span></div>
                  <StatusBadge status={r.release_status} />
                </div>
                <Textarea className="text-xs h-16" placeholder="Customer comms draft (not sent)" defaultValue={r.customer_comms_draft ?? ""} onBlur={async e => { if (e.target.value !== (r.customer_comms_draft ?? "")) { await updateRelease(r.id, { customer_comms_draft: e.target.value }); reload(); } }} />
                <div className="flex gap-1 flex-wrap">
                  <Select value={r.release_status} onValueChange={(v) => setStatus(r.id, v)}>
                    <SelectTrigger className="h-7 w-[170px] text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{RELEASE_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                  {r.release_status === "founder_review" && <Button size="sm" variant="outline" onClick={async () => { await approveRelease(r.id); reload(); }}>Approve</Button>}
                  {r.release_status !== "founder_review" && (r.customer_comms_draft ?? "").trim().length > 0 && (
                    <Button size="sm" variant="outline"
                      title="Marks the customer comms draft for founder review. Does not send."
                      onClick={async () => {
                        try { await markReleaseCommsReadyForReview(r.id); toast.success("Comms draft flagged for founder review"); reload(); }
                        catch (e: any) { toast.error(e.message); }
                      }}>
                      Comms ready for review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </OLSection>
        ))}
      </div>
    </OLLayout>
  );
}
