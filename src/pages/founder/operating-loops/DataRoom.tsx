import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveToken, createToken, decideShareRequest, fetchShareRequests, fetchTokens, pendingApprovalCount, revokeToken, type DataRoomToken, type ShareRequest } from "@/lib/operatingLoops/dataRoomHardeningEngine";
import { toast } from "sonner";
import { fetchWindDownSummary, type WindDownSummary } from "@/lib/lifecycleHandoffs";
import { AlertTriangle } from "lucide-react";

export default function DataRoomPage() {
  const [tokens, setTokens] = useState<DataRoomToken[]>([]);
  const [reqs, setReqs] = useState<ShareRequest[]>([]);
  const [windDown, setWindDown] = useState<WindDownSummary | null>(null);
  const [name, setName] = useState(""); const [org, setOrg] = useState("");
  const reload = () => {
    fetchTokens().then(setTokens).catch(e => toast.error(e.message));
    fetchShareRequests().then(setReqs).catch(() => {});
    fetchWindDownSummary().then(setWindDown).catch(() => setWindDown(null));
  };
  useEffect(() => { reload(); }, []);

  const add = async () => { if (!name.trim()) return; try { await createToken({ investor_name: name.trim(), organisation: org }); setName(""); setOrg(""); reload(); toast.success("Access token recorded (no live link)."); } catch (e: any) { toast.error(e.message); } };

  return (
    <OLLayout title="Investor data room hardening"
      subtitle="Per-investor access governance with watermarking, view-only defaults, NDA and audit trail."
      disclaimer="No live external sharing. Recording approved access intent only. Founder/admin must approve before any external link is created.">
      {windDown && windDown.total > 0 && (
        <div className="border border-amber-500/50 bg-amber-500/10 rounded p-3 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-300">
              Wind-down records present ({windDown.active} active of {windDown.total})
            </p>
            <p className="text-amber-200/80">
              Data tied to these businesses must be reviewed before any new investor share is approved.
              Nothing has been deleted or auto-revoked.
              {windDown.business_names.length > 0 && (
                <> Affected: <span className="font-mono">{windDown.business_names.join(", ")}</span>.</>
              )}
            </p>
          </div>
        </div>
      )}
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
