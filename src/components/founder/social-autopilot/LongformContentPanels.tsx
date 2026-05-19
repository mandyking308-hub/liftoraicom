import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Lock } from "lucide-react";

async function call(path: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function getJson(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
  return res.json();
}

const Tile = ({ l, v }: { l: string; v: any }) => (
  <div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground uppercase">{l}</p><p className="text-sm font-semibold">{v ?? "—"}</p></div>
);
const Result = ({ r }: { r: any }) => r ? <pre className="text-[11px] bg-secondary/30 p-2 rounded overflow-auto max-h-48">{JSON.stringify(r, null, 2)}</pre> : null;

export function LongformContentHealthPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  const refresh = async () => setD(await getJson(`longform-content-healthcheck${businessId ? `?business_id=${businessId}` : ""}`));
  useEffect(() => { if (businessId) refresh(); }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><BookOpen size={16} /> Long-Form Content Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <Tile l="Strategies" v={d?.strategies_total} />
          <Tile l="SEO briefs" v={d?.seo_briefs_total} />
          <Tile l="Drafts" v={d?.drafts_total} />
          <Tile l="Need review" v={d?.drafts_needing_review} />
          <Tile l="Newsletter seq" v={d?.newsletter_sequences_total} />
          <Tile l="Repurposing" v={d?.repurposing_maps_total} />
          <Tile l="Exports" v={d?.manual_exports_total} />
          <Tile l="Export-ready" v={d?.export_ready_count} />
          <Tile l="Manually published" v={d?.manually_published_external_count} />
          <Tile l="Open gaps" v={d?.open_gap_reviews} />
          <Tile l="Unsupported claims" v={d?.unsupported_claims_count} />
          <Tile l="Missing proof" v={d?.missing_proof_count} />
          <Tile l="Pages published" v={d?.pages_published_total ?? 0} />
          <Tile l="Newsletters sent" v={d?.newsletters_sent_total ?? 0} />
          <Tile l="Ext API calls" v={d?.external_api_calls_total ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewCreate({ title, previewPath, createPath, phrase, fields, businessId, extra }: { title: string; previewPath: string; createPath: string; phrase: string; fields: Array<[string,string]>; businessId: string; extra?: Record<string, any> }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [r, setR] = useState<any>(null);
  const [test, setTest] = useState(true);
  const body = { business_id: businessId, ...vals, ...(extra ?? {}), is_test_data: test };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          {fields.map(([k, p]) => (
            k === "draft_body" || k === "founder_notes" ?
              <Textarea key={k} placeholder={p} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /> :
              <Input key={k} placeholder={p} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
          ))}
        </div>
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} /> mark as test_data</label>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={async () => setR(await call(previewPath, body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call(createPath, { ...body, dry_run: false, confirmation_phrase: phrase }))}>Create ({phrase})</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function LongformStrategyPanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="Long-form strategy" previewPath="longform-strategy-preview" createPath="longform-strategy-create" phrase="CREATE LONGFORM CONTENT STRATEGY" fields={[["strategy_name","Strategy name"],["strategy_type","Type (blog, seo, newsletter, thought_leadership…)"],["target_audience","Target audience"],["primary_goal","Primary goal"]]} />;
}
export function SEOContentBriefPanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="SEO content brief" previewPath="seo-content-brief-preview" createPath="seo-content-brief-create" phrase="CREATE SEO CONTENT BRIEF" fields={[["brief_name","Brief name"],["topic","Topic"],["target_keyword","Target keyword (optional)"],["search_intent","Search intent (informational/commercial…)"]]} />;
}
export function LongformDraftPanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="Long-form draft" previewPath="longform-draft-preview" createPath="longform-draft-create" phrase="CREATE LONGFORM CONTENT DRAFT" fields={[["draft_title","Draft title"],["draft_type","Type (blog_post/seo_article/newsletter/faq_article…)"],["target_audience","Target audience"],["primary_goal","Primary goal"],["suggested_cta","Suggested CTA"],["draft_body","Draft body (optional)"]]} />;
}
export function NewsletterSequencePanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="Newsletter sequence" previewPath="newsletter-sequence-preview" createPath="newsletter-sequence-create" phrase="CREATE NEWSLETTER SEQUENCE PLAN" fields={[["sequence_name","Sequence name"],["sequence_type","Type (welcome/nurture/onboarding…)"],["target_audience","Target audience"],["sequence_goal","Sequence goal"],["email_count","Email count (number)"]]} extra={{ create_draft_emails: true }} />;
}
export function LongformRepurposingPanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="Repurposing map" previewPath="longform-repurposing-preview" createPath="longform-repurposing-create" phrase="CREATE LONGFORM REPURPOSING MAP" fields={[["map_name","Map name"],["source_draft_id","Source draft id (uuid)"],["target_outputs","Comma list (blog,newsletter,instagram…)"]]} />;
}
export function LongformGapAnalysisPanel({ businessId }: { businessId: string }) {
  const [r, setR] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Content gap analysis</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("longform-content-gap-analysis", { business_id: businessId }))}>Preview gaps</Button>
          <Button size="sm" onClick={async () => setR(await call("longform-content-gap-analysis", { business_id: businessId, dry_run: false, confirmation_phrase: "SAVE LONGFORM CONTENT GAP ANALYSIS" }))}>Save gaps</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}
export function LongformManualExportPanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="Manual export pack" previewPath="longform-manual-export-preview" createPath="longform-manual-export-create" phrase="CREATE LONGFORM MANUAL EXPORT" fields={[["export_name","Export name"],["export_type","Type (manual_copy_pack/wordpress_operator/substack_operator…)"],["draft_id","Draft id (uuid, optional)"],["sequence_id","Sequence id (uuid, optional)"]]} />;
}
export function LongformLiveConfirmationPanel({ businessId }: { businessId: string }) {
  return <PreviewCreate businessId={businessId} title="Confirm manually published" previewPath="longform-live-confirmation-record" createPath="longform-live-confirmation-record" phrase="CONFIRM LONGFORM CONTENT MANUALLY PUBLISHED" fields={[["draft_id","Draft id (uuid, optional)"],["sequence_id","Sequence id (uuid, optional)"],["export_pack_id","Export pack id (uuid, optional)"],["external_url","External URL"],["confirmation_notes","Notes"]]} />;
}
export function LongformDraftListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { if (!businessId) return; supabase.from("longform_content_drafts").select("id,draft_title,draft_type,draft_status,approval_status,external_publish_status").eq("business_id", businessId).order("created_at",{ascending:false}).limit(50).then(({data}) => setRows(data ?? [])); }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Draft list</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No drafts yet.</p> :
          <div className="space-y-1">{rows.map(r => <div key={r.id} className="p-2 rounded bg-secondary/40 text-xs flex justify-between"><span>{r.draft_title} · {r.draft_type}</span><span>{r.draft_status} / {r.external_publish_status}</span></div>)}</div>}
      </CardContent></Card>
  );
}
export function LongformContentAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { if (!businessId) return; supabase.from("longform_content_audit").select("id,action,action_status,created_at").eq("business_id", businessId).order("created_at",{ascending:false}).limit(30).then(({data}) => setRows(data ?? [])); }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Audit log</CardTitle></CardHeader>
      <CardContent>{rows.length === 0 ? <p className="text-sm text-muted-foreground">No audit entries.</p> :
        <div className="space-y-1">{rows.map(r => <div key={r.id} className="p-2 rounded bg-secondary/40 text-xs flex justify-between"><span>{r.action}</span><span>{r.action_status} · {new Date(r.created_at).toLocaleString()}</span></div>)}</div>}
      </CardContent></Card>
  );
}

export function LongformContentDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-start gap-2">
        <Lock size={14} className="mt-0.5" />
        <div><p className="font-semibold">Internal drafts only</p><p className="text-muted-foreground mt-0.5">Liftor never publishes blogs, sends newsletters, or calls CMS/email-tool APIs. Founder/operator exports and publishes manually.</p></div>
      </div>
      <LongformContentHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <LongformStrategyPanel businessId={businessId} />
        <SEOContentBriefPanel businessId={businessId} />
        <LongformDraftPanel businessId={businessId} />
        <NewsletterSequencePanel businessId={businessId} />
        <LongformRepurposingPanel businessId={businessId} />
        <LongformGapAnalysisPanel businessId={businessId} />
        <LongformManualExportPanel businessId={businessId} />
        <LongformLiveConfirmationPanel businessId={businessId} />
      </div>
      <LongformDraftListPanel businessId={businessId} />
      <LongformContentAuditPanel businessId={businessId} />
    </div>
  );
}