import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Inbox, Lock, Upload, Wand2, UserSearch, MessageCircle, AlertOctagon, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

async function call(path: string, body: any, method: "POST" | "GET" = "POST") {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  try { return await res.json(); } catch { return { ok: false, error: "bad_json" }; }
}

const SafetyBadge = () => (
  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
    <Lock size={10} className="mr-1" /> No DMs · no comments · internal capture only
  </Badge>
);

const tile = (l: string, v: any) => (
  <div className="p-2 rounded bg-secondary/40">
    <p className="text-[10px] text-muted-foreground uppercase">{l}</p>
    <p className="text-sm font-semibold">{v ?? "—"}</p>
  </div>
);

export function SocialEngagementInboxHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = async () => setData(await call(`social-engagement-inbox-healthcheck?business_id=${businessId}`, {}, "GET"));
  useEffect(() => { if (businessId) refresh(); /* eslint-disable-next-line */ }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Inbox size={16} /> Engagement Inbox Health</CardTitle>
        <div className="flex gap-2 items-center"><SafetyBadge /><Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {tile("Events", data?.engagement_events_total)}
          {tile("Unclassified", data?.unclassified_count)}
          {tile("Unmatched", data?.unmatched_count)}
          {tile("Possible CRM", data?.possible_crm_matches)}
          {tile("Drafts", data?.reply_drafts_count)}
          {tile("Escalations open", data?.escalations_open)}
          {tile("Complaints", data?.complaints_detected)}
          {tile("Support", data?.support_detected)}
          {tile("Creator", data?.creator_interest_detected)}
          {tile("Lead", data?.lead_interest_detected)}
          {tile("Spam/abuse", data?.spam_abuse_count)}
          {tile("Test data", data?.test_data_count)}
          {tile("DMs sent", data?.dms_sent_total ?? 0)}
          {tile("Comments sent", data?.comments_sent_total ?? 0)}
          {tile("Provider calls", data?.provider_calls_total ?? 0)}
          {tile("External actions", data?.external_actions_total ?? 0)}
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialEngagementCapturePanel({ businessId }: { businessId: string }) {
  const [platform, setPlatform] = useState("instagram");
  const [eventType, setEventType] = useState("comment");
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [testData, setTestData] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const doPreview = async () => setPreview(await call("social-engagement-capture-preview", {
    business_id: businessId, platform, event_type: eventType, social_handle: handle, message_text: message, detected_keyword: keyword || undefined, is_test_data: testData,
  }));
  const doCreate = async () => setResult(await call("social-engagement-capture-create", {
    business_id: businessId, platform, event_type: eventType, social_handle: handle, message_text: message, detected_keyword: keyword || undefined, is_test_data: testData,
    dry_run: false, confirmation_phrase: "CAPTURE SOCIAL ENGAGEMENT",
  }));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Wand2 size={16} /> Capture Engagement</CardTitle>
        <SafetyBadge />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-4 gap-2">
          <Input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="platform" />
          <Input value={eventType} onChange={e => setEventType(e.target.value)} placeholder="event_type" />
          <Input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" />
          <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="keyword (optional)" />
        </div>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="message text" rows={3} />
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={testData} onChange={e => setTestData(e.target.checked)} /> mark as test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={doPreview} disabled={!businessId || !message}>Preview</Button>
          <Button size="sm" onClick={doCreate} disabled={!businessId || !message}>Capture (phrase-gated)</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(preview, null, 2)}</pre>}
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementImportPanel({ businessId }: { businessId: string }) {
  const [name, setName] = useState("Manual batch");
  const [rowsText, setRowsText] = useState('[{"platform":"instagram","event_type":"comment","social_handle":"@fan1","message_text":"CANDY please send the link","detected_keyword":"CANDY"}]');
  const [testData, setTestData] = useState(true);
  const [out, setOut] = useState<any>(null);
  let parsed: any[] = []; try { parsed = JSON.parse(rowsText); } catch {}
  const doPreview = async () => setOut(await call("social-engagement-import-preview", { business_id: businessId, import_name: name, rows: parsed, is_test_data: testData }));
  const doCreate = async () => setOut(await call("social-engagement-import-create", { business_id: businessId, import_name: name, rows: parsed, is_test_data: testData, dry_run: false, confirmation_phrase: "IMPORT SOCIAL ENGAGEMENT" }));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Upload size={16} /> Import Engagement Batch</CardTitle>
        <SafetyBadge />
      </CardHeader>
      <CardContent className="space-y-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="import name" />
        <Textarea value={rowsText} onChange={e => setRowsText(e.target.value)} rows={5} className="font-mono text-[11px]" />
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={testData} onChange={e => setTestData(e.target.checked)} /> mark as test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={doPreview} disabled={!businessId}>Preview</Button>
          <Button size="sm" onClick={doCreate} disabled={!businessId}>Import (phrase-gated)</Button>
        </div>
        {out && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementEventListPanel({ businessId, onSelect }: { businessId: string; onSelect: (id: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await (supabase as any).from("social_engagement_events").select("id, platform, event_type, social_handle, message_text, intent, sentiment, event_status, crm_match_status, urgency, risk_level, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  const filtered = rows.filter(r => !filter || JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><ListChecks size={16} /> Engagement Events ({rows.length})</CardTitle>
        <div className="flex gap-2 items-center">
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter…" className="h-8 w-40" />
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 max-h-96 overflow-auto">
        {filtered.length === 0 ? <p className="text-xs text-muted-foreground">No events.</p> : filtered.map(r => (
          <button key={r.id} onClick={() => onSelect(r.id)} className="w-full text-left p-2 rounded bg-secondary/40 hover:bg-secondary text-xs flex justify-between gap-2">
            <div className="truncate">
              <span className="font-mono">{r.platform}/{r.event_type}</span> · {r.social_handle ?? "—"} · <span className="text-muted-foreground">{r.message_text?.slice(0, 80)}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              {r.intent && <Badge variant="outline" className="text-[9px]">{r.intent}</Badge>}
              {r.urgency && r.urgency !== "normal" && <Badge variant="secondary" className="text-[9px]">{r.urgency}</Badge>}
              {r.crm_match_status === "unmatched" && <Badge variant="outline" className="text-[9px]">unmatched</Badge>}
              <Badge variant="outline" className="text-[9px]">{r.event_status}</Badge>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementEventDetailPanel({ businessId, eventId }: { businessId: string; eventId: string | null }) {
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    if (!eventId) { setRow(null); return; }
    (supabase as any).from("social_engagement_events").select("*").eq("id", eventId).maybeSingle().then(({ data }: any) => setRow(data));
  }, [eventId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Event Detail</CardTitle></CardHeader>
      <CardContent>
        {!row ? <p className="text-xs text-muted-foreground">Select an event.</p> :
          <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-72 overflow-auto">{JSON.stringify(row, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementClassificationPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Classification</CardTitle><SafetyBadge />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setOut(await call("social-engagement-classify-preview", { business_id: businessId, limit: 25 }))}>Preview</Button>
          <Button size="sm" onClick={async () => setOut(await call("social-engagement-classify-create", { business_id: businessId, dry_run: false, confirmation_phrase: "CLASSIFY SOCIAL ENGAGEMENT", limit: 25 }))}>Classify (phrase-gated)</Button>
        </div>
        {out && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementCRMMatchPanel({ businessId, eventId }: { businessId: string; eventId: string | null }) {
  const [out, setOut] = useState<any>(null);
  const [crm, setCrm] = useState("");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><UserSearch size={16} /> CRM Match</CardTitle><SafetyBadge />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setOut(await call("social-engagement-crm-match-preview", { business_id: businessId, engagement_event_id: eventId, limit: 25 }))} disabled={!businessId}>Preview</Button>
        </div>
        <div className="flex gap-2">
          <Input value={crm} onChange={e => setCrm(e.target.value)} placeholder="crm_contact_id (optional)" />
          <Button size="sm" onClick={async () => setOut(await call("social-engagement-crm-match-apply", { business_id: businessId, engagement_event_id: eventId, crm_contact_id: crm || null, dry_run: false, confirmation_phrase: "APPLY SOCIAL CRM MATCH" }))} disabled={!eventId}>Apply (phrase-gated)</Button>
        </div>
        {out && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementReplyDraftPanel({ businessId, eventId }: { businessId: string; eventId: string | null }) {
  const [out, setOut] = useState<any>(null);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><MessageCircle size={16} /> Reply Draft (internal only)</CardTitle><SafetyBadge />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setOut(await call("social-engagement-reply-draft-preview", { business_id: businessId, engagement_event_id: eventId }))} disabled={!eventId}>Preview draft</Button>
          <Button size="sm" onClick={async () => setOut(await call("social-engagement-reply-draft-create", { business_id: businessId, engagement_event_id: eventId, dry_run: false, confirmation_phrase: "CREATE SOCIAL REPLY DRAFT" }))} disabled={!eventId}>Save draft (phrase-gated)</Button>
          <Button size="sm" variant="outline" disabled>Send (disabled — provider locked)</Button>
        </div>
        {out && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementEscalationPanel({ businessId, eventId }: { businessId: string; eventId: string | null }) {
  const [type, setType] = useState("founder_review");
  const [priority, setPriority] = useState("normal");
  const [reason, setReason] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><AlertOctagon size={16} /> Escalation</CardTitle><SafetyBadge />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <Input value={type} onChange={e => setType(e.target.value)} placeholder="escalation_type" />
          <Input value={priority} onChange={e => setPriority(e.target.value)} placeholder="priority" />
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="reason" />
        </div>
        <Button size="sm" onClick={async () => setOut(await call("social-engagement-escalation-create", { business_id: businessId, engagement_event_id: eventId, escalation_type: type, priority, reason, dry_run: false, confirmation_phrase: "CREATE SOCIAL ENGAGEMENT ESCALATION" }))} disabled={!eventId}>Create escalation (phrase-gated)</Button>
        {out && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await (supabase as any).from("social_engagement_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Audit Log</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-1 max-h-72 overflow-auto">
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No audit entries.</p> : rows.map(r => (
          <div key={r.id} className="text-[10px] font-mono bg-secondary/40 p-1.5 rounded">
            {new Date(r.created_at).toLocaleString()} · {r.action} · {r.action_status} · provider:{r.provider_calls} dms:{r.dms_sent} comments:{r.comments_sent}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementInboxDashboard({ businessId }: { businessId: string }) {
  const [eventId, setEventId] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <SocialEngagementInboxHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialEngagementCapturePanel businessId={businessId} />
        <SocialEngagementImportPanel businessId={businessId} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SocialEngagementEventListPanel businessId={businessId} onSelect={setEventId} />
        <SocialEngagementEventDetailPanel businessId={businessId} eventId={eventId} />
      </div>
      <SocialEngagementClassificationPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialEngagementCRMMatchPanel businessId={businessId} eventId={eventId} />
        <SocialEngagementReplyDraftPanel businessId={businessId} eventId={eventId} />
      </div>
      <SocialEngagementEscalationPanel businessId={businessId} eventId={eventId} />
      <SocialEngagementAuditPanel businessId={businessId} />
    </div>
  );
}