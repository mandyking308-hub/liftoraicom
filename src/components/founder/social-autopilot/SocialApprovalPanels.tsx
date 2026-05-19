import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

async function call(path: string, init: RequestInit) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token ?? "";
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const r = await fetch(url, { ...init, headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}`, ...(init.headers||{}) } });
  return r.json();
}

export function SocialApprovalHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = () => businessId && call(`social-approval-healthcheck?business_id=${businessId}`, { method:"GET" }).then(setData);
  useEffect(()=>{ refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Approval Health</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs">
        {!data ? <p className="text-muted-foreground">No data.</p> :
          <div className="grid grid-cols-2 gap-2">{Object.entries(data).filter(([k])=>!["ok","no_external_action"].includes(k)).map(([k,v])=>(
            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{String(v)}</span></div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialApprovalQueuePanel({ businessId, onSelect }: { businessId: string; onSelect?: (id:string)=>void }) {
  const [data, setData] = useState<any>(null);
  const [type, setType] = useState("");
  const refresh = () => businessId && call("social-approval-queue-preview", { method:"POST", body: JSON.stringify({ business_id: businessId, review_type: type || undefined }) }).then(setData);
  useEffect(()=>{ refresh(); }, [businessId, type]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Approval Queue</CardTitle>
      <div className="flex gap-2">
        <select className="border rounded h-9 px-2 bg-background text-sm" value={type} onChange={e=>setType(e.target.value)}>
          <option value="">All types</option><option value="content_item">content_item</option><option value="calendar_item">calendar_item</option><option value="content_pack">content_pack</option><option value="reply_job">reply_job</option>
        </select>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </div></CardHeader>
      <CardContent className="text-xs space-y-1">
        {!data?.reviews?.length ? <p className="text-muted-foreground">No reviews.</p> :
          data.reviews.slice(0, 50).map((r:any)=>(
            <div key={r.id} className="flex items-center justify-between border rounded p-2 cursor-pointer hover:bg-muted/40" onClick={()=>onSelect?.(r.id)}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{r.review_type}</Badge>
                <span>{r.title ?? r.id.slice(0,8)}</span>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-[10px]">risk:{r.risk_level}</Badge>
                <Badge variant={r.review_status==="blocked"?"destructive":"secondary"} className="text-[10px]">{r.review_status}</Badge>
                {(r.approval_blockers ?? []).length>0 && <Badge variant="destructive" className="text-[10px]">{r.approval_blockers.length} blocker(s)</Badge>}
              </div>
            </div>
          ))}
      </CardContent></Card>
  );
}

export function SocialContentApprovalPanel({ businessId }: { businessId: string }) {
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Content Approval Review Creator</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Scans unreviewed content items and creates approval review records (blocked items are auto-flagged, not auto-approved).</p>
        <div className="flex gap-2">
          <Button size="sm" disabled={!businessId} onClick={async()=>{
            const r = await call("social-approval-review-create", { method:"POST", body: JSON.stringify({ business_id: businessId, review_type:"content_item" }) });
            setOut(r);
          }}>Preview</Button>
          <Input className="max-w-[300px]" placeholder='confirmation: CREATE SOCIAL APPROVAL REVIEWS' value={phrase} onChange={e=>setPhrase(e.target.value)} />
          <Button size="sm" disabled={!businessId || phrase!=="CREATE SOCIAL APPROVAL REVIEWS"} onClick={async()=>{
            const r = await call("social-approval-review-create", { method:"POST", body: JSON.stringify({ business_id: businessId, review_type:"content_item", dry_run:false, confirmation_phrase: phrase }) });
            setOut(r);
          }}>Create content reviews</Button>
        </div>
        {out && <pre className="text-xs bg-muted p-2 rounded max-h-48 overflow-auto">{JSON.stringify({ proposed_count: out.proposed_count, created: out.created }, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCalendarApprovalPanel({ businessId }: { businessId: string }) {
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Calendar Item Approval Review Creator</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex gap-2">
          <Button size="sm" disabled={!businessId} onClick={async()=>{
            const r = await call("social-approval-review-create", { method:"POST", body: JSON.stringify({ business_id: businessId, review_type:"calendar_item" }) });
            setOut(r);
          }}>Preview</Button>
          <Input className="max-w-[300px]" placeholder='confirmation: CREATE SOCIAL APPROVAL REVIEWS' value={phrase} onChange={e=>setPhrase(e.target.value)} />
          <Button size="sm" disabled={!businessId || phrase!=="CREATE SOCIAL APPROVAL REVIEWS"} onClick={async()=>{
            const r = await call("social-approval-review-create", { method:"POST", body: JSON.stringify({ business_id: businessId, review_type:"calendar_item", dry_run:false, confirmation_phrase: phrase }) });
            setOut(r);
          }}>Create calendar reviews</Button>
        </div>
        {out && <pre className="text-xs bg-muted p-2 rounded max-h-48 overflow-auto">{JSON.stringify({ proposed_count: out.proposed_count, created: out.created }, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialApprovalDecisionPanel({ businessId }: { businessId: string }) {
  const [reviewId, setReviewId] = useState("");
  const [decision, setDecision] = useState("approve");
  const [notes, setNotes] = useState("");
  const [editReq, setEditReq] = useState("");
  const [phrase, setPhrase] = useState("");
  const [highRiskPhrase, setHighRiskPhrase] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Apply Decision</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="review_id" value={reviewId} onChange={e=>setReviewId(e.target.value)} />
        <div className="flex gap-2">
          <select className="border rounded h-9 px-2 bg-background text-sm" value={decision} onChange={e=>setDecision(e.target.value)}>
            {["approve","reject","needs_edit","park","escalate","block"].map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <Button size="sm" disabled={!reviewId} onClick={async()=>{
            const r = await call("social-approval-decision-preview", { method:"POST", body: JSON.stringify({ business_id: businessId, review_id: reviewId, decision }) });
            setPreview(r);
          }}>Preview</Button>
        </div>
        <Textarea placeholder="founder notes" value={notes} onChange={e=>setNotes(e.target.value)} />
        {decision==="needs_edit" && <Textarea placeholder="edit request" value={editReq} onChange={e=>setEditReq(e.target.value)} />}
        <Input placeholder='confirmation: APPLY SOCIAL APPROVAL DECISION' value={phrase} onChange={e=>setPhrase(e.target.value)} />
        {preview?.high_risk_override_required && <Input placeholder='high-risk override: APPROVE HIGH RISK SOCIAL ITEM' value={highRiskPhrase} onChange={e=>setHighRiskPhrase(e.target.value)} />}
        <Button size="sm" variant="default" disabled={!reviewId || phrase!=="APPLY SOCIAL APPROVAL DECISION"} onClick={async()=>{
          const r = await call("social-approval-decision-apply", { method:"POST", body: JSON.stringify({ business_id: businessId, review_id: reviewId, decision, founder_notes: notes, edit_request: editReq, dry_run:false, confirmation_phrase: phrase, high_risk_phrase: highRiskPhrase }) });
          setSaved(r);
        }}>Apply</Button>
        {preview && <pre className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto">{JSON.stringify(preview, null, 2)}</pre>}
        {saved && <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(saved, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialApprovalBatchPanel({ businessId }: { businessId: string }) {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [batchId, setBatchId] = useState("");
  const [phrase, setPhrase] = useState("");
  const [phrase2, setPhrase2] = useState("");
  const [saved, setSaved] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Batch Approval (safe items only)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Button size="sm" disabled={!businessId} onClick={async()=>{
          const r = await call("social-approval-batch-preview", { method:"POST", body: JSON.stringify({ business_id: businessId }) });
          setPreview(r);
        }}>Preview safe items</Button>
        {preview && <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(preview, null, 2)}</pre>}
        <Input placeholder="batch name" value={name} onChange={e=>setName(e.target.value)} />
        <Input placeholder='confirmation: CREATE SOCIAL APPROVAL BATCH' value={phrase} onChange={e=>setPhrase(e.target.value)} />
        <Button size="sm" disabled={!preview?.safe_review_ids?.length || phrase!=="CREATE SOCIAL APPROVAL BATCH"} onClick={async()=>{
          const r = await call("social-approval-batch-create", { method:"POST", body: JSON.stringify({ business_id: businessId, batch_name: name || "Batch", batch_type:"mixed", review_ids: preview.safe_review_ids, dry_run:false, confirmation_phrase: phrase }) });
          setBatchId(r.batch_id ?? ""); setSaved(r);
        }}>Create batch</Button>
        <Input placeholder="batch id (auto from above)" value={batchId} onChange={e=>setBatchId(e.target.value)} />
        <Input placeholder='confirmation: APPLY SOCIAL BATCH APPROVAL' value={phrase2} onChange={e=>setPhrase2(e.target.value)} />
        <Button size="sm" variant="default" disabled={!batchId || phrase2!=="APPLY SOCIAL BATCH APPROVAL"} onClick={async()=>{
          const r = await call("social-approval-batch-decision-apply", { method:"POST", body: JSON.stringify({ business_id: businessId, batch_id: batchId, decision:"approve", dry_run:false, confirmation_phrase: phrase2 }) });
          setSaved(r);
        }}>Apply batch (low-risk approve)</Button>
        {saved && <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(saved, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialApprovalRulesPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [phrase, setPhrase] = useState("");
  return (
    <Card><CardHeader><CardTitle className="text-base">Approval Rules</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex gap-2">
          <Button size="sm" disabled={!businessId} onClick={async()=>{
            const r = await call("social-approval-rules-generate", { method:"POST", body: JSON.stringify({ business_id: businessId }) });
            setOut(r);
          }}>Preview rules</Button>
          <Input className="max-w-[300px]" placeholder='confirmation: CREATE SOCIAL APPROVAL RULES' value={phrase} onChange={e=>setPhrase(e.target.value)} />
          <Button size="sm" variant="default" disabled={!businessId || phrase!=="CREATE SOCIAL APPROVAL RULES"} onClick={async()=>{
            const r = await call("social-approval-rules-generate", { method:"POST", body: JSON.stringify({ business_id: businessId, dry_run:false, confirmation_phrase: phrase }) });
            setOut(r);
          }}>Save rules</Button>
        </div>
        {out && <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialApprovalHistoryPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ if(!businessId) return;
    supabase.from("social_approval_decisions").select("*").eq("business_id", businessId).order("decided_at", { ascending: false }).limit(50).then(({data})=>setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Decision History</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1">
        {!rows.length ? <p className="text-muted-foreground">No decisions yet.</p> :
          rows.map(r=>(
            <div key={r.id} className="flex justify-between border rounded p-1">
              <span><Badge variant="outline" className="text-[10px] mr-2">{r.decision}</Badge>{r.decided_by ?? "—"}</span>
              <span className="text-muted-foreground font-mono">{new Date(r.decided_at).toISOString().slice(0,16)}</span>
            </div>
          ))}
      </CardContent></Card>
  );
}

export function SocialApprovalDashboard({ businessId }: { businessId: string }) {
  const [selected, setSelected] = useState("");
  return (
    <div className="space-y-4">
      <SocialApprovalHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialContentApprovalPanel businessId={businessId} />
        <SocialCalendarApprovalPanel businessId={businessId} />
      </div>
      <SocialApprovalQueuePanel businessId={businessId} onSelect={setSelected} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialApprovalDecisionPanel businessId={businessId} />
        <SocialApprovalBatchPanel businessId={businessId} />
        <SocialApprovalRulesPanel businessId={businessId} />
        <SocialApprovalHistoryPanel businessId={businessId} />
      </div>
      {selected && <p className="text-xs text-muted-foreground">Selected review_id: <span className="font-mono">{selected}</span> — paste into the decision panel above.</p>}
    </div>
  );
}
