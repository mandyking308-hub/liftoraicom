import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QTCLayout, QTCSection, QTCEmpty, statusTone } from "./_shared";

type P = { id: string; proposal_title: string; proposal_status: string; proposal_summary: string | null; founder_approval_required: boolean; created_at: string };

export default function QTCProposals() {
  const [rows, setRows] = useState<P[]>([]);
  const load = () => supabase.from("qtc_proposals").select("id,proposal_title,proposal_status,proposal_summary,founder_approval_required,created_at").order("created_at",{ascending:false}).limit(200).then(r=>setRows((r.data as P[])||[]));
  useEffect(()=>{ load(); },[]);

  const setStatus = async (id: string, proposal_status: string, extra: Record<string,any> = {}) => {
    const { error } = await supabase.from("qtc_proposals").update({ proposal_status, ...extra }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Proposal → ${proposal_status}`); load(); }
  };

  return (
    <QTCLayout title="Proposals" subtitle="Drafts run live. Sending requires founder approval.">
      {rows.length === 0 ? <QTCEmpty title="No proposals yet" /> : (
        <QTCSection title={`Proposals (${rows.length})`}>
          <div className="space-y-2">
            {rows.map(p => (
              <div key={p.id} className="p-3 rounded border border-border/50 text-xs space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{p.proposal_title}</p>
                    {p.proposal_summary && <p className="text-[11px] text-muted-foreground line-clamp-2">{p.proposal_summary}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusTone[p.proposal_status]||""}`}>{p.proposal_status}</Badge>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" disabled={p.proposal_status!=="draft"} onClick={()=>setStatus(p.id,"approval_required")}>Request approval</Button>
                  <Button size="sm" variant="outline" disabled={p.proposal_status!=="approval_required"} onClick={()=>setStatus(p.id,"approved",{ founder_approved_at: new Date().toISOString() })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={p.proposal_status!=="approved"} onClick={()=>setStatus(p.id,"sent",{ sent_at: new Date().toISOString() })}>Mark sent</Button>
                  <Button size="sm" variant="outline" disabled={p.proposal_status!=="sent"} onClick={()=>setStatus(p.id,"accepted",{ accepted_at: new Date().toISOString() })}>Mark accepted</Button>
                </div>
              </div>
            ))}
          </div>
        </QTCSection>
      )}
    </QTCLayout>
  );
}