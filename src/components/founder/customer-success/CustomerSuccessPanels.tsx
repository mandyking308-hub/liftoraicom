import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldCheck, AlertTriangle, Activity } from "lucide-react";

type Biz = { id: string; name: string };

function useBusinesses() {
  const [list, setList] = useState<Biz[]>([]);
  useEffect(() => {
    (supabase as any).from("businesses").select("id,name").order("name").then(({ data }: any) => setList((data ?? []) as Biz[]));
  }, []);
  return list;
}

async function invoke(fn: string, body: any) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) return { ok: false, error: error.message };
  return data;
}

const SafeBadge = () => (
  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
    <Lock size={10} className="mr-1" /> No send · No invite · No charge · No subscription change
  </Badge>
);

function ResultBox({ result }: { result: any }) {
  if (!result) return null;
  return <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
}

function Banner() {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-start gap-2">
      <Lock size={14} className="mt-0.5" />
      <div>
        <p className="font-semibold">Internal-only customer success layer.</p>
        <p className="text-muted-foreground mt-0.5">
          Liftor does not send customer emails, create portal accounts, send portal invites, send surveys,
          share reports, charge customers or change subscriptions. All drafts and reviews are internal until
          a human acts externally and records the confirmation manually.
        </p>
      </div>
    </div>
  );
}

/* ---------- Generic preview+create panel ---------- */
function CrudPanel({ businessId, title, previewFn, createFn, phrase, extra }: {
  businessId: string; title: string; previewFn: string; createFn: string; phrase: string;
  extra?: Record<string, any>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);
  const payload = () => ({ business_id: businessId, notes, ...(extra ?? {}) });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2">{title} <SafeBadge /></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Textarea placeholder="Notes / context (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" rows={2} />
        <Input placeholder={`Confirmation: ${phrase}`} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="text-xs" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke(previewFn, { ...payload(), dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke(createFn, { ...payload(), dry_run: false, confirmation, record: { notes } }))}>Create</Button>
        </div>
        <ResultBox result={result} />
      </CardContent>
    </Card>
  );
}

/* ---------- Specific panels ---------- */
export function CustomerSuccessProfilePanel({ businessId }: { businessId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("paying_customer");
  const [offer, setOffer] = useState("");
  const [goal, setGoal] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<any>(null);
  const payload = () => ({ business_id: businessId, customer_name: name, customer_email: email, customer_type: type, purchased_offer: offer, customer_goal: goal });
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2">Success Profile <SafeBadge /></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Customer name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Customer email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input placeholder="Customer type" value={type} onChange={e => setType(e.target.value)} />
          <Input placeholder="Purchased offer" value={offer} onChange={e => setOffer(e.target.value)} />
          <Input className="col-span-2" placeholder="Customer goal" value={goal} onChange={e => setGoal(e.target.value)} />
          <Input className="col-span-2" placeholder="Confirmation: CREATE CUSTOMER SUCCESS PROFILE" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("customer-success-profile-preview", { ...payload(), dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("customer-success-profile-create", { ...payload(), record: payload(), dry_run: false, confirmation }))}>Create</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">external_api_calls = 0. No customer message sent.</p>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function CustomerOnboardingPlanPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Onboarding Plan" previewFn="customer-onboarding-plan-preview" createFn="customer-onboarding-plan-create" phrase="CREATE CUSTOMER ONBOARDING PLAN" />;
}
export function CustomerWelcomePackPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Welcome Pack" previewFn="customer-welcome-pack-preview" createFn="customer-welcome-pack-create" phrase="CREATE CUSTOMER WELCOME PACK" />;
}
export function ClientPortalBlueprintPanel({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px]">NO PORTAL ACCOUNT CREATION</Badge>
        <Badge variant="outline" className="text-[10px]">NO LOGIN CREATION</Badge>
        <Badge variant="outline" className="text-[10px]">NO PORTAL INVITE</Badge>
        <Badge variant="outline" className="text-[10px]">NO DEPLOY</Badge>
        <Badge variant="outline" className="text-[10px]">INTERNAL BLUEPRINT ONLY</Badge>
      </div>
      <CrudPanel businessId={businessId} title="Client Portal Blueprint" previewFn="client-portal-blueprint-preview" createFn="client-portal-blueprint-create" phrase="CREATE CLIENT PORTAL BLUEPRINT" />
    </div>
  );
}
export function ClientPortalContentPackPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Portal Content Pack" previewFn="client-portal-content-pack-preview" createFn="client-portal-content-pack-create" phrase="CREATE CLIENT PORTAL CONTENT PACK" />;
}
export function CustomerBeddingInPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Bedding-In Review" previewFn="customer-bedding-in-review-generate" createFn="customer-bedding-in-review-generate" phrase="CREATE CUSTOMER BEDDING IN REVIEW" />;
}
export function CustomerSuccessCheckinPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Success Check-In" previewFn="customer-success-checkin-create" createFn="customer-success-checkin-create" phrase="CREATE CUSTOMER SUCCESS CHECKIN" />;
}
export function CustomerSurveyPanel({ businessId }: { businessId: string }) {
  const [surveyId, setSurveyId] = useState("");
  const [csat, setCsat] = useState("");
  const [nps, setNps] = useState("");
  const [summary, setSummary] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <div className="space-y-3">
      <CrudPanel businessId={businessId} title="Survey Draft" previewFn="customer-survey-draft-create" createFn="customer-survey-draft-create" phrase="CREATE CUSTOMER SURVEY DRAFT" />
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2">Record Survey Response <SafeBadge /></CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Survey ID" value={surveyId} onChange={e => setSurveyId(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="CSAT (1-5)" value={csat} onChange={e => setCsat(e.target.value)} />
            <Input placeholder="NPS (-100..100)" value={nps} onChange={e => setNps(e.target.value)} />
          </div>
          <Textarea placeholder="Response summary (verbatim from customer)" value={summary} onChange={e => setSummary(e.target.value)} className="text-xs" rows={2} />
          <Input placeholder="Confirmation: RECORD CUSTOMER SURVEY RESPONSE" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
          <Button size="sm" onClick={async () => setResult(await invoke("customer-survey-response-record", {
            business_id: businessId, dry_run: false, confirmation,
            record: { survey_id: surveyId, csat_score: csat ? Number(csat) : null, nps_score: nps ? Number(nps) : null, response_summary: summary },
          }))}>Record</Button>
          <p className="text-[10px] text-yellow-400 flex items-center gap-1"><AlertTriangle size={10} /> Do not invent responses. Record verbatim only.</p>
          <ResultBox result={result} />
        </CardContent></Card>
    </div>
  );
}
export function CustomerQuarterlyReportPanel({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-yellow-400 flex items-center gap-1"><AlertTriangle size={10} /> Internal until manually shared. Missing evidence stays visible. Do not invent metrics.</div>
      <CrudPanel businessId={businessId} title="Quarterly Report" previewFn="customer-quarterly-report-preview" createFn="customer-quarterly-report-create" phrase="CREATE CUSTOMER QUARTERLY REPORT" />
    </div>
  );
}
export function CustomerRenewalReviewPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Renewal Review" previewFn="customer-renewal-review-generate" createFn="customer-renewal-review-generate" phrase="CREATE CUSTOMER RENEWAL REVIEW" />;
}
export function CustomerRetentionRiskPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Retention Risk Review" previewFn="customer-retention-risk-review-generate" createFn="customer-retention-risk-review-generate" phrase="CREATE CUSTOMER RETENTION RISK REVIEW" />;
}
export function CustomerUpsellOpportunityPanel({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-yellow-400 flex items-center gap-1"><AlertTriangle size={10} /> Evidence-based only. Do not invent results. Founder approval required.</div>
      <CrudPanel businessId={businessId} title="Upsell Opportunity" previewFn="customer-upsell-opportunity-generate" createFn="customer-upsell-opportunity-generate" phrase="CREATE CUSTOMER UPSELL OPPORTUNITY" />
    </div>
  );
}
export function CustomerWinbackPlanPanel({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-yellow-400 flex items-center gap-1"><AlertTriangle size={10} /> founder_attention_needed = true. external_send_allowed = false.</div>
      <CrudPanel businessId={businessId} title="Win-Back Plan" previewFn="customer-winback-plan-generate" createFn="customer-winback-plan-generate" phrase="CREATE CUSTOMER WINBACK PLAN" />
    </div>
  );
}
export function CustomerSuccessManualExportPanel({ businessId }: { businessId: string }) {
  return <CrudPanel businessId={businessId} title="Manual Export Pack" previewFn="customer-success-manual-export-preview" createFn="customer-success-manual-export-create" phrase="CREATE CUSTOMER SUCCESS MANUAL EXPORT" />;
}

export function CustomerSuccessManualConfirmationPanel({ businessId }: { businessId: string }) {
  const [objectType, setObjectType] = useState("welcome_pack");
  const [objectId, setObjectId] = useState("");
  const [confirmationType, setConfirmationType] = useState("welcome_pack_shared_manually");
  const [externalUrl, setExternalUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2">Manual Confirmation <SafeBadge /></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Object type" value={objectType} onChange={e => setObjectType(e.target.value)} />
          <Input placeholder="Object ID" value={objectId} onChange={e => setObjectId(e.target.value)} />
          <Input className="col-span-2" placeholder="Confirmation type" value={confirmationType} onChange={e => setConfirmationType(e.target.value)} />
          <Input className="col-span-2" placeholder="External URL (optional)" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} />
          <Textarea className="col-span-2 text-xs" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          <Input className="col-span-2" placeholder="Confirmation: CONFIRM CUSTOMER SUCCESS MANUAL ACTION" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        </div>
        <Button size="sm" onClick={async () => setResult(await invoke("customer-success-manual-confirmation-record", {
          business_id: businessId, dry_run: false, confirmation,
          record: { object_type: objectType, object_id: objectId || null, confirmation_type: confirmationType, external_url: externalUrl || null, notes },
        }))}>Record</Button>
        <p className="text-[10px] text-muted-foreground">Internal status update only. No external action performed by Liftor.</p>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function CustomerSuccessHealthPanel() {
  const [data, setData] = useState<any>(null);
  const refresh = async () => setData(await invoke("customer-success-healthcheck", {}));
  useEffect(() => { refresh(); }, []);
  const tile = (label: string, v: any) => (
    <div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-semibold">{v ?? "—"}</p></div>
  );
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16} /> Customer Success Health <SafeBadge /></CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
    </CardHeader>
      <CardContent className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
        {tile("Profiles", data?.success_profiles_total)}
        {tile("Onboarding", data?.onboarding_plans_total)}
        {tile("Onboarding review", data?.onboarding_needing_review)}
        {tile("Welcome packs", data?.welcome_packs_total)}
        {tile("Portal blueprints", data?.portal_blueprints_total)}
        {tile("Portal content packs", data?.portal_content_packs_total)}
        {tile("Bedding reviews due", data?.bedding_reviews_due)}
        {tile("Check-ins due", data?.checkins_due)}
        {tile("Survey drafts", data?.surveys_draft_total)}
        {tile("Survey responses", data?.survey_responses_recorded)}
        {tile("Quarterly reports", data?.quarterly_reports_total)}
        {tile("QR review", data?.quarterly_reports_needing_review)}
        {tile("Renewals 60d", data?.renewals_due_60d)}
        {tile("Retention reviews", data?.retention_risk_reviews_total)}
        {tile("High risk", data?.high_risk_customers)}
        {tile("Upsells", data?.upsell_opportunities_total)}
        {tile("Win-backs", data?.winback_plans_total)}
        {tile("Manual exports", data?.manual_exports_total)}
        {tile("Messages sent", data?.customer_messages_sent_total ?? 0)}
        {tile("Portal accounts", data?.portal_accounts_created_total ?? 0)}
        {tile("Portal invites", data?.portal_invites_sent_total ?? 0)}
        {tile("Surveys sent", data?.surveys_sent_total ?? 0)}
        {tile("Reports shared", data?.reports_shared_total ?? 0)}
        {tile("Payments", data?.payments_created_total ?? 0)}
        {tile("Subs changed", data?.subscriptions_changed_total ?? 0)}
        {tile("Fake data", data?.fake_customer_data_created_total ?? 0)}
      </CardContent></Card>
  );
}

export function CustomerSuccessAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("customer_success_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity size={16} /> Audit Log <SafeBadge /></CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No audit entries.</p> :
          <div className="space-y-1 text-xs max-h-72 overflow-auto">{rows.map(r => (
            <div key={r.id} className="p-2 rounded bg-secondary/40 flex justify-between gap-3">
              <span className="truncate">{r.action} {r.action_status ? `· ${r.action_status}` : ""}</span>
              <span className="text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
            </div>))}</div>}
      </CardContent></Card>
  );
}

/* ---------- Dashboard ---------- */
export function CustomerSuccessDashboard() {
  const businesses = useBusinesses();
  const [businessId, setBusinessId] = useState<string>("");
  useEffect(() => { if (!businessId && businesses[0]) setBusinessId(businesses[0].id); }, [businesses]);
  return (
    <div className="space-y-4">
      <Banner />
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Business</label>
        <select className="bg-background border border-border rounded px-2 py-1 text-xs" value={businessId} onChange={e => setBusinessId(e.target.value)}>
          <option value="">— select —</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <CustomerSuccessHealthPanel />
      {!businessId ? <p className="text-xs text-muted-foreground">Select a business to manage customer success.</p> : (
        <div className="grid md:grid-cols-2 gap-4">
          <CustomerSuccessProfilePanel businessId={businessId} />
          <CustomerOnboardingPlanPanel businessId={businessId} />
          <CustomerWelcomePackPanel businessId={businessId} />
          <ClientPortalBlueprintPanel businessId={businessId} />
          <ClientPortalContentPackPanel businessId={businessId} />
          <CustomerBeddingInPanel businessId={businessId} />
          <CustomerSuccessCheckinPanel businessId={businessId} />
          <CustomerSurveyPanel businessId={businessId} />
          <CustomerQuarterlyReportPanel businessId={businessId} />
          <CustomerRenewalReviewPanel businessId={businessId} />
          <CustomerRetentionRiskPanel businessId={businessId} />
          <CustomerUpsellOpportunityPanel businessId={businessId} />
          <CustomerWinbackPlanPanel businessId={businessId} />
          <CustomerSuccessManualExportPanel businessId={businessId} />
          <CustomerSuccessManualConfirmationPanel businessId={businessId} />
        </div>
      )}
      {businessId && <CustomerSuccessAuditPanel businessId={businessId} />}
    </div>
  );
}

export function ClientPortalDashboard() {
  const businesses = useBusinesses();
  const [businessId, setBusinessId] = useState<string>("");
  useEffect(() => { if (!businessId && businesses[0]) setBusinessId(businesses[0].id); }, [businesses]);
  return (
    <div className="space-y-4">
      <Banner />
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Business</label>
        <select className="bg-background border border-border rounded px-2 py-1 text-xs" value={businessId} onChange={e => setBusinessId(e.target.value)}>
          <option value="">— select —</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <CustomerSuccessHealthPanel />
      {businessId && (
        <div className="grid md:grid-cols-2 gap-4">
          <ClientPortalBlueprintPanel businessId={businessId} />
          <ClientPortalContentPackPanel businessId={businessId} />
          <CustomerSuccessManualExportPanel businessId={businessId} />
          <CustomerSuccessManualConfirmationPanel businessId={businessId} />
        </div>
      )}
    </div>
  );
}

export default CustomerSuccessDashboard;