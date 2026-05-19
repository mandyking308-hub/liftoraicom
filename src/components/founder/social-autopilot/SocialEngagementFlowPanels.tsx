import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

async function call(path: string, body: any, method: "POST" | "GET" = "POST") {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const res = await fetch(url, {
    method, headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  try { return await res.json(); } catch { return { ok: false, error: "bad_json" }; }
}

const SafetyBadge = () => (
  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
    <Lock size={10} className="mr-1" /> No DMs · no comments · no ManyChat API
  </Badge>
);

export function SocialEngagementFlowHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = async () => setData(await call(`social-engagement-flow-healthcheck?business_id=${businessId}`, {}, "GET"));
  useEffect(() => { if (businessId) refresh(); /* eslint-disable-next-line */ }, [businessId]);
  const tile = (l: string, v: any) => (<div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground uppercase">{l}</p><p className="text-sm font-semibold">{v ?? "—"}</p></div>);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><MessageSquare size={16} /> Engagement Flow Health</CardTitle>
        <div className="flex gap-2 items-center"><SafetyBadge /><Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {tile("Keyword rules", data?.keyword_rules_total)}
          {tile("Approved", data?.keyword_rules_approved)}
          {tile("DM flows", data?.dm_flows_total)}
          {tile("Approved flows", data?.dm_flows_approved)}
          {tile("Manual exports", data?.manual_exports_total)}
          {tile("Manually configured", data?.manually_configured_count)}
          {tile("Manually live", data?.manually_live_count)}
          {tile("Validation failed", data?.validation_failed_count)}
          {tile("Blocked flows", data?.blocked_flows)}
          {tile("DMs sent", data?.dms_sent_total ?? 0)}
          {tile("Comments sent", data?.comments_sent_total ?? 0)}
          {tile("Provider calls", data?.provider_calls_total ?? 0)}
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialKeywordRulePanel({ businessId }: { businessId: string }) {
  const [keyword, setKeyword] = useState("CANDY");
  const [platform, setPlatform] = useState("instagram");
  const [ruleName, setRuleName] = useState("CANDY keyword");
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Keyword Trigger Rule</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Rule name" value={ruleName} onChange={e => setRuleName(e.target.value)} />
          <Input placeholder="Keyword" value={keyword} onChange={e => setKeyword(e.target.value)} />
          <Input placeholder="Platform" value={platform} onChange={e => setPlatform(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-keyword-rule-preview", { business_id: businessId, keyword, platform }))}>Preview</Button>
          <Input placeholder='Confirm phrase: CREATE SOCIAL KEYWORD RULE' value={phrase} onChange={e => setPhrase(e.target.value)} className="max-w-[320px]" />
          <Button size="sm" onClick={async () => setResult(await call("social-keyword-rule-create", { business_id: businessId, rule_name: ruleName, keyword, platform, dry_run: false, confirmation_phrase: phrase }))}>Create</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[200px]">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialKeywordRuleListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_keyword_trigger_rules").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Keyword Rules</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No keyword rules yet.</p> :
          <div className="space-y-1 text-xs">{rows.map(r => (
            <div key={r.id} className="p-2 bg-secondary/40 rounded flex justify-between gap-2">
              <span><span className="font-semibold">{r.keyword}</span> · {r.platform} · {r.rule_name}</span>
              <span><Badge variant="secondary">{r.rule_status}</Badge> {r.flow_id ? <Badge>flow</Badge> : null}</span>
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialDMFlowPlannerPanel({ businessId }: { businessId: string }) {
  const [flowType, setFlowType] = useState("music_link");
  const [platform, setPlatform] = useState("instagram");
  const [flowName, setFlowName] = useState("CANDY music link flow");
  const [buttonUrl, setButtonUrl] = useState("https://neoncandy.net/music");
  const [phrase, setPhrase] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const doPreview = async () => setPreview(await call("social-dm-flow-preview", { business_id: businessId, flow_type: flowType, platform, button_url: buttonUrl }));
  const doCreate = async () => {
    const p = preview?.preview ?? {};
    setResult(await call("social-dm-flow-create", {
      business_id: businessId, flow_name: flowName, flow_type: flowType, platform,
      public_reply_text: p.public_reply_text, dm_opening_text: p.dm_opening_text,
      button_label: p.button?.label, button_url: p.button?.url,
      follow_up_question: p.follow_up_question,
      qualification_questions: p.qualification_questions,
      routing_rules: p.routing_rules, escalation_rules: p.escalation_rules, stop_conditions: p.stop_conditions,
      compliance_warnings: p.compliance_warnings,
      dry_run: false, confirmation_phrase: phrase,
    }));
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">DM Flow Planner</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="Flow name" value={flowName} onChange={e => setFlowName(e.target.value)} />
          <Input placeholder="Flow type (e.g. music_link, lead_magnet)" value={flowType} onChange={e => setFlowType(e.target.value)} />
          <Input placeholder="Platform" value={platform} onChange={e => setPlatform(e.target.value)} />
          <Input placeholder="Button URL" value={buttonUrl} onChange={e => setButtonUrl(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={doPreview}>Preview</Button>
          <Input placeholder="Confirm: CREATE SOCIAL DM FLOW BLUEPRINT" value={phrase} onChange={e => setPhrase(e.target.value)} className="max-w-[360px]" />
          <Button size="sm" onClick={doCreate} disabled={!preview}>Create blueprint</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[260px]">{JSON.stringify(preview, null, 2)}</pre>}
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[200px]">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialDMFlowDetailPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_dm_flow_blueprints").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">DM Flow Blueprints</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No DM flow blueprints yet.</p> :
          <div className="space-y-2 text-xs">{rows.map(r => (
            <div key={r.id} className="p-2 bg-secondary/40 rounded">
              <div className="flex justify-between"><span className="font-semibold">{r.flow_name}</span><Badge variant="secondary">{r.flow_status}</Badge></div>
              <p className="text-muted-foreground">{r.flow_type} · {r.platform}</p>
              <p>Public: {r.public_reply_text ?? "—"}</p>
              <p>DM: {r.dm_opening_text ?? "—"}</p>
              <p>Button: {r.button_label ?? "—"} {r.button_url ? `→ ${r.button_url}` : ""}</p>
              <p>Follow-up: {r.follow_up_question ?? "—"}</p>
              <p className="text-muted-foreground text-[10px]">id: {r.id}</p>
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialDMFlowStepsPanel({ businessId }: { businessId: string }) {
  const [flowId, setFlowId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    if (!flowId) return;
    const { data } = await supabase.from("social_dm_flow_steps").select("*").eq("business_id", businessId).eq("flow_id", flowId).order("step_order");
    setRows(data ?? []);
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Flow Steps</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2"><Input placeholder="flow_id" value={flowId} onChange={e => setFlowId(e.target.value)} /><Button size="sm" onClick={load}>Load</Button></div>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">Paste a flow_id and load.</p> :
          <div className="space-y-1 text-xs">{rows.map(s => (
            <div key={s.id} className="p-2 bg-secondary/40 rounded">
              <span className="font-mono mr-2">#{s.step_order}</span><Badge variant="secondary">{s.step_type}</Badge>
              {s.message_text && <p className="mt-1">{s.message_text}</p>}
              {s.button_label && <p>Button: {s.button_label} → {s.button_url}</p>}
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialDMFlowValidationPanel({ businessId }: { businessId: string }) {
  const [flowId, setFlowId] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Validate DM Flow</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2"><Input placeholder="flow_id" value={flowId} onChange={e => setFlowId(e.target.value)} />
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-dm-flow-validate", { business_id: businessId, flow_id: flowId }))}>Validate (dry-run)</Button></div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[200px]">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialManyChatManualExportPanel({ businessId }: { businessId: string }) {
  const [flowId, setFlowId] = useState("");
  const [keywordRuleId, setKeywordRuleId] = useState("");
  const [exportName, setExportName] = useState("ManyChat manual setup pack");
  const [phrase, setPhrase] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">ManyChat Manual Setup Export</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="flow_id" value={flowId} onChange={e => setFlowId(e.target.value)} />
          <Input placeholder="keyword_rule_id (optional)" value={keywordRuleId} onChange={e => setKeywordRuleId(e.target.value)} />
          <Input placeholder="Export name" value={exportName} onChange={e => setExportName(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={async () => setPreview(await call("social-manychat-manual-export-preview", { business_id: businessId, flow_id: flowId, keyword_rule_id: keywordRuleId || undefined }))}>Preview</Button>
          <Input placeholder="Confirm: CREATE MANYCHAT MANUAL SETUP EXPORT" value={phrase} onChange={e => setPhrase(e.target.value)} className="max-w-[360px]" />
          <Button size="sm" onClick={async () => setResult(await call("social-manychat-manual-export-create", { business_id: businessId, flow_id: flowId, keyword_rule_id: keywordRuleId || undefined, export_name: exportName, dry_run: false, confirmation_phrase: phrase }))}>Create export</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[260px]">{JSON.stringify(preview, null, 2)}</pre>}
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[200px]">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialManyChatSetupConfirmPanel({ businessId }: { businessId: string }) {
  const [exportId, setExportId] = useState("");
  const [flowId, setFlowId] = useState("");
  const [keywordRuleId, setKeywordRuleId] = useState("");
  const [notes, setNotes] = useState("");
  const [markLive, setMarkLive] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [livePhrase, setLivePhrase] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Confirm Manual Setup</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="export_id" value={exportId} onChange={e => setExportId(e.target.value)} />
          <Input placeholder="flow_id" value={flowId} onChange={e => setFlowId(e.target.value)} />
          <Input placeholder="keyword_rule_id" value={keywordRuleId} onChange={e => setKeywordRuleId(e.target.value)} />
        </div>
        <Textarea placeholder="Confirmation notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={markLive} onChange={e => setMarkLive(e.target.checked)} /> Mark manually LIVE (requires extra phrase)</label>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="CONFIRM MANYCHAT MANUAL SETUP" value={phrase} onChange={e => setPhrase(e.target.value)} className="max-w-[320px]" />
          {markLive && <Input placeholder="CONFIRM MANYCHAT FLOW IS LIVE" value={livePhrase} onChange={e => setLivePhrase(e.target.value)} className="max-w-[320px]" />}
          <Button size="sm" onClick={async () => setResult(await call("social-manychat-manual-setup-confirm", {
            business_id: businessId,
            export_id: exportId || undefined, flow_id: flowId || undefined, keyword_rule_id: keywordRuleId || undefined,
            confirmation_notes: notes, mark_live: markLive,
            dry_run: false, confirmation_phrase: phrase, live_confirmation_phrase: livePhrase,
          }))}>Confirm</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-auto max-h-[200px]">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialEngagementFlowAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_engagement_flow_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Engagement Flow Audit</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No audit entries yet.</p> :
          <div className="space-y-1 text-xs">{rows.map(r => (
            <div key={r.id} className="p-2 bg-secondary/40 rounded flex justify-between gap-2">
              <span>{new Date(r.created_at).toLocaleString()} · <span className="font-mono">{r.action}</span></span>
              <span>provider:{r.provider_calls} · dms:{r.dms_sent} · comments:{r.comments_sent}</span>
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialEngagementFlowDashboard({ businessId }: { businessId: string }) {
  if (!businessId) return <p className="text-sm text-muted-foreground">Set a business to plan engagement flows.</p>;
  return (
    <div className="space-y-4">
      <SocialEngagementFlowHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialKeywordRulePanel businessId={businessId} />
        <SocialKeywordRuleListPanel businessId={businessId} />
      </div>
      <SocialDMFlowPlannerPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialDMFlowDetailPanel businessId={businessId} />
        <SocialDMFlowStepsPanel businessId={businessId} />
      </div>
      <SocialDMFlowValidationPanel businessId={businessId} />
      <SocialManyChatManualExportPanel businessId={businessId} />
      <SocialManyChatSetupConfirmPanel businessId={businessId} />
      <SocialEngagementFlowAuditPanel businessId={businessId} />
    </div>
  );
}