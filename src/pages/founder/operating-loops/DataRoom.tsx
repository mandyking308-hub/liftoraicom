import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveToken, createToken, decideShareRequest, fetchShareRequests, fetchTokens, pendingApprovalCount, revokeToken, type DataRoomToken, type ShareRequest } from "@/lib/operatingLoops/dataRoomHardeningEngine";
import { toast } from "sonner";

export default function DataRoomPage() {
  const [tokens, setTokens] = useState<DataRoomToken[]>([]);
  const [reqs, setReqs] = useState<ShareRequest[]>([]);
  const [name, setName] = useState(""); const [org, setOrg] = useState("");
  const reload = () => { fetchTokens().then(setTokens).catch(e => toast.error(e.message)); fetchShareRequests().then(setReqs).catch(() => {}); };
  useEffect(() => { reload(); }, []);

  const add = async () => { if (!name.trim()) return; try { await createToken({ investor_name: name.trim(), organisation: org }); setName(""); setOrg(""); reload(); toast.success("Access token recorded (no live link)."); } catch (e: any) { toast.error(e.message); } };

  return (
    <OLLayout title="Investor data room hardening"
      subtitle="Per-investor access governance with watermarking, view-only defaults, NDA and audit trail."
      disclaimer="No live external sharing. Recording approved access intent only. Founder/admin must approve before any external link is created.">
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Tokens</p><p className="text-sm font-bold">{tokens.length}</p></div>
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Pending approvals</p><p className="text-sm font-bold">{pendingApprovalCount(tokens, reqs)}</p></div>
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Share requests</p><p className="text-sm font-bold">{reqs.length}</p></div>
      </div>
      <OLSection title="Record investor access request">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Investor / buyer name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Organisation" value={org} onChange={e => setOrg(e.target.value)} />
          <Button onClick={add}>Record</Button>
        </div>
      </OLSection>
      <OLSection title={`Access tokens (${tokens.length})`}>
        {tokens.length === 0 ? <p className="text-muted-foreground">None.</p> : (
          <div className="space-y-1">{tokens.map(t => (
            <div key={t.id} className="flex items-center justify-between border-b border-border/20 py-1">
              <div><span className="font-medium">{t.investor_name}</span> <span className="text-muted-foreground">· {t.organisation ?? "—"} · NDA {t.nda_status} · {t.view_only ? "view-only" : "downloads on"} · watermark {t.watermark_enabled ? "on" : "off"}</span></div>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.approval_status} />
                {t.approval_status === "pending" && <Button size="sm" variant="outline" onClick={async () => { await approveToken(t.id); reload(); }}>Approve</Button>}
                {t.approval_status === "approved" && !t.revoked_at && <Button size="sm" variant="outline" onClick={async () => { await revokeToken(t.id, "founder revoke"); reload(); }}>Revoke</Button>}
              </div>
            </div>
          ))}</div>
        )}
      </OLSection>
      <OLSection title={`Share requests (${reqs.length})`}>
        {reqs.length === 0 ? <p className="text-muted-foreground">None.</p> : (
          <div className="space-y-1">{reqs.map(r => (
            <div key={r.id} className="flex items-center justify-between border-b border-border/20 py-1">
              <div><span className="font-medium">{r.investor_name}</span> <span className="text-muted-foreground">· {r.organisation ?? "—"} · {r.requested_scope ?? "—"}</span></div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === "pending" && <>
                  <Button size="sm" variant="outline" onClick={async () => { await decideShareRequest(r.id, "approved"); reload(); }}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={async () => { await decideShareRequest(r.id, "rejected"); reload(); }}>Reject</Button>
                </>}
              </div>
            </div>
          ))}</div>
        )}
      </OLSection>
    </OLLayout>
  );
}
