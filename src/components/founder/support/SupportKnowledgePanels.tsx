import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Lock, Plus, AlertTriangle, BookOpen, MessageSquare, FileCheck, GitBranch, Upload, Activity } from "lucide-react";

type Biz = { id: string; name: string };

function useBusinesses() {
  const [list, setList] = useState<Biz[]>([]);
  useEffect(() => { supabase.from("businesses").select("id,name").order("name").then(({ data }) => setList((data ?? []) as Biz[])); }, []);
  return list;
}

async function invoke(fn: string, body: any) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw error; if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

const SafeBadge = () => (
  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
    <Lock size={10} className="mr-1" /> No external send · No live chat · No helpdesk API
  </Badge>
);

export function SupportHealthPanel({ businessId }: { businessId: string }) {
  const [h, setH] = useState<any>(null);
  const reload = async () => { if (!businessId) return; try { setH(await invoke("support-healthcheck", { business_id: businessId })); } catch {} };
  useEffect(() => { reload(); }, [businessId]);
  const stat = (l: string, v: any, danger = false) => (
    <div className={`p-2 rounded border ${danger ? "border-destructive/40 bg-destructive/10" : "border-border/40 bg-secondary/30"}`}>
      <div className="text-lg font-semibold">{v ?? "—"}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</div>
    </div>
  );
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Activity size={14} className="text-primary" /> Support Health</span><SafeBadge /></CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          {stat("Sources", h?.knowledge_sources_total)}
          {stat("Approved", h?.approved_sources)}
          {stat("FAQs", h?.faq_items_total)}
          {stat("Articles", h?.articles_total)}
          {stat("Questions", h?.support_questions_total)}
          {stat("Reply drafts", h?.reply_drafts_total)}
          {stat("Needs triage", h?.support_questions_needing_triage)}
          {stat("Open escalations", h?.open_escalations, (h?.open_escalations ?? 0) > 0)}
          {stat("Complaints", h?.complaint_escalations, (h?.complaint_escalations ?? 0) > 0)}
          {stat("Urgent risk", h?.urgent_risk_escalations, (h?.urgent_risk_escalations ?? 0) > 0)}
          {stat("Missing source", h?.missing_source_count, (h?.missing_source_count ?? 0) > 0)}
          {stat("Quality fails", h?.quality_reviews_failed, (h?.quality_reviews_failed ?? 0) > 0)}
        </div>
        <div className="mt-3 text-[10px] text-muted-foreground flex flex-wrap gap-3">
          <span>External API calls: <b>0</b></span>
          <span>Customer replies sent: <b>0</b></span>
          <span>Live chats started: <b>0</b></span>
          <span>Tickets created externally: <b>0</b></span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportKnowledgeSourcePanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState(""); const [type, setType] = useState("user_manual");
  const [text, setText] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => { const { data } = await (supabase as any).from("support_knowledge_sources").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const register = async () => {
    setLoading(true); setErr(null);
    try { await invoke("support-knowledge-source-register", { business_id: businessId, source_name: name, source_type: type, source_text: text, dry_run: false, confirmation_phrase: "REGISTER SUPPORT KNOWLEDGE SOURCE" }); setName(""); setText(""); await reload(); onChange?.(); }
    catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  const approve = async (id: string) => {
    try { await invoke("support-knowledge-source-approve", { business_id: businessId, source_id: id, dry_run: false, confirmation_phrase: "APPROVE SUPPORT KNOWLEDGE SOURCE" }); await reload(); onChange?.(); }
    catch (e: any) { setErr(e.message ?? String(e)); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen size={14} className="text-primary" /> Support Knowledge Sources</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div><Label className="text-xs">Source name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NeonCandy refund policy v2" /></div>
          <div><Label className="text-xs">Source type</Label>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {["technical_manual","user_manual","website","policy","contract","faq","product_info","service_info","pricing","onboarding_doc","support_script","customer_note","founder_note","imported_text","other"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <Textarea placeholder="Paste source text (optional)" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[80px] text-xs" />
        <Button size="sm" disabled={loading || !name} onClick={register}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Register source</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-72 overflow-auto">
          {list.map((s) => (
            <div key={s.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate"><span className="text-muted-foreground">[{s.source_type}]</span> {s.source_name}</div>
              <div className="flex gap-1 shrink-0 items-center">
                <Badge variant="secondary" className="text-[9px]">{s.source_status}</Badge>
                <Badge variant="secondary" className="text-[9px]">{s.reliability_level}</Badge>
                {s.approved_for_support
                  ? <Badge variant="secondary" className="text-[9px] bg-green-500/15 text-green-400"><ShieldCheck size={9} className="mr-0.5" /> approved</Badge>
                  : <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1" onClick={() => approve(s.id)}>approve</Button>}
              </div>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No sources yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportFAQGeneratorPanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => { const { data } = await (supabase as any).from("support_faq_items").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const create = async () => {
    setLoading(true); setErr(null);
    try { await invoke("support-faq-generate-create", { business_id: businessId, dry_run: false, confirmation_phrase: "CREATE SUPPORT FAQ ITEMS" }); await reload(); onChange?.(); }
    catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck size={14} className="text-primary" /> FAQ Generator</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" disabled={loading} onClick={create}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Generate FAQ drafts</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {list.map((f) => (
            <div key={f.id} className="text-xs p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate"><b>{f.question}</b></div>
              <div className="flex gap-1 mt-1">
                <Badge variant="secondary" className="text-[9px]">{f.faq_status}</Badge>
                <Badge variant="secondary" className="text-[9px]">{f.faq_category ?? "other"}</Badge>
                {(f.missing_source_flags ?? []).length > 0 && <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">missing source</Badge>}
              </div>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No FAQs yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportArticleGeneratorPanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [type, setType] = useState("help_article"); const [q, setQ] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const reload = async () => { const { data } = await (supabase as any).from("support_knowledge_articles").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const create = async () => {
    setLoading(true); setErr(null);
    try {
      const prev = await invoke("support-article-generate-preview", { business_id: businessId, article_type: type, customer_question: q || undefined });
      await invoke("support-article-generate-create", { business_id: businessId, article: (prev as any).preview, dry_run: false, confirmation_phrase: "CREATE SUPPORT ARTICLE DRAFT" });
      setQ(""); await reload(); onChange?.();
    } catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen size={14} className="text-primary" /> Support Article Generator</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {["faq_answer","help_article","troubleshooting","onboarding","pricing_answer","billing_answer","refund_policy_answer","delivery_answer","technical_support","account_access","complaint_handling","escalation_script","internal_operator_note","other"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="Customer question (optional)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="sm" disabled={loading} onClick={create}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Draft article (no publish)</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {list.map((a) => (
            <div key={a.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate"><span className="text-muted-foreground">[{a.article_type}]</span> {a.article_title ?? a.title}</div>
              <div className="flex gap-1 shrink-0">
                <Badge variant="secondary" className="text-[9px]">{a.approval_status ?? a.status}</Badge>
                <Badge variant="secondary" className="text-[9px]">{a.publish_status ?? "not_published"}</Badge>
              </div>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No articles yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportQuestionCapturePanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [q, setQ] = useState(""); const [email, setEmail] = useState(""); const [name, setName] = useState("");
  const [list, setList] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => { const { data } = await (supabase as any).from("support_question_intake").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const capture = async () => {
    setLoading(true); setErr(null);
    try { await invoke("support-question-capture-create", { business_id: businessId, question_text: q, customer_email: email || undefined, customer_name: name || undefined, dry_run: false, confirmation_phrase: "CAPTURE SUPPORT QUESTION" }); setQ(""); setEmail(""); setName(""); await reload(); onChange?.(); }
    catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare size={14} className="text-primary" /> Customer Question Capture</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Textarea placeholder="Paste customer question / DM / email body" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-[64px] text-xs" />
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="Customer name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Customer email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button size="sm" disabled={loading || !q.trim()} onClick={capture}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Capture (no reply sent)</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {list.map((r) => (
            <div key={r.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate"><span className="text-muted-foreground">[{r.detected_intent ?? "?"} · {r.urgency}]</span> {r.question_text}</div>
              <div className="flex gap-1 shrink-0">
                <Badge variant="secondary" className="text-[9px]">{r.question_status}</Badge>
                {r.risk_level !== "low" && <Badge variant="secondary" className="text-[9px] bg-destructive/20 text-destructive">{r.risk_level}</Badge>}
              </div>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No questions yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportTriagePanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => { const { data } = await (supabase as any).from("support_triage_reviews").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const triage = async () => {
    setLoading(true); setErr(null);
    try { await invoke("support-question-triage-create", { business_id: businessId, dry_run: false, confirmation_phrase: "TRIAGE SUPPORT QUESTIONS" }); await reload(); onChange?.(); }
    catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitBranch size={14} className="text-primary" /> Triage Reviews</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" disabled={loading} onClick={triage}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Triage captured questions</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {list.map((r) => (
            <div key={r.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate"><span className="text-muted-foreground">[{r.category ?? "?"} · {r.intent ?? "?"}]</span> → {r.recommended_agent ?? "support_agent"}</div>
              <div className="flex gap-1 shrink-0">
                <Badge variant="secondary" className="text-[9px]">{r.triage_status}</Badge>
                <Badge variant="secondary" className="text-[9px]">{r.urgency}</Badge>
              </div>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No triage records.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportReplyDraftPanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [questions, setQuestions] = useState<any[]>([]); const [drafts, setDrafts] = useState<any[]>([]);
  const [qId, setQId] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => {
    const [{ data: q }, { data: d }] = await Promise.all([
      (supabase as any).from("support_question_intake").select("id,question_text,detected_intent").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("support_reply_drafts").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    ]);
    setQuestions(q ?? []); setDrafts(d ?? []);
  };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const draft = async () => {
    if (!qId) return; setLoading(true); setErr(null);
    try {
      const prev = await invoke("support-reply-draft-preview", { business_id: businessId, question_intake_id: qId });
      await invoke("support-reply-draft-create", { business_id: businessId, question_intake_id: qId, reply: (prev as any).preview, dry_run: false, confirmation_phrase: "CREATE SUPPORT REPLY DRAFT" });
      setQId(""); await reload(); onChange?.();
    } catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between gap-2"><span className="flex items-center gap-2"><MessageSquare size={14} className="text-primary" /> Reply Drafts (send locked)</span><SafeBadge /></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Question</Label>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={qId} onChange={(e) => setQId(e.target.value)}>
              <option value="">— select —</option>
              {questions.map((q) => <option key={q.id} value={q.id}>[{q.detected_intent ?? "?"}] {q.question_text.slice(0, 80)}</option>)}
            </select>
          </div>
          <Button size="sm" disabled={loading || !qId} onClick={draft}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Draft reply</Button>
        </div>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {drafts.map((d) => (
            <div key={d.id} className="text-xs p-2 rounded border border-border/30 bg-background/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">[{d.reply_type}]</span>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="secondary" className="text-[9px]">{d.reply_status}</Badge>
                  <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">send locked</Badge>
                </div>
              </div>
              <div className="mt-1 line-clamp-2">{d.reply_body}</div>
            </div>
          ))}
          {!drafts.length && <div className="text-[11px] text-muted-foreground">No reply drafts.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportEscalationPanel({ businessId, onChange }: { businessId: string; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([]); const [type, setType] = useState("founder_review"); const [reason, setReason] = useState(""); const [qId, setQId] = useState("");
  const [questions, setQuestions] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => {
    const [{ data: e }, { data: q }] = await Promise.all([
      (supabase as any).from("support_escalations").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("support_question_intake").select("id,question_text").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    ]);
    setList(e ?? []); setQuestions(q ?? []);
  };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const create = async () => {
    setLoading(true); setErr(null);
    try { await invoke("support-escalation-create", { business_id: businessId, question_intake_id: qId || undefined, escalation_type: type, reason, dry_run: false, confirmation_phrase: "CREATE SUPPORT ESCALATION" }); setReason(""); setQId(""); await reload(); onChange?.(); }
    catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle size={14} className="text-primary" /> Escalations</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid sm:grid-cols-3 gap-2">
          <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {["founder_review","customer_success","technical_support","complaint","dispute","refund_review","billing_review","legal_review","compliance_review","privacy_review","urgent_risk","ops_review","other"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={qId} onChange={(e) => setQId(e.target.value)}>
            <option value="">— question (optional) —</option>
            {questions.map((q) => <option key={q.id} value={q.id}>{q.question_text.slice(0, 60)}</option>)}
          </select>
          <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button size="sm" disabled={loading} onClick={create}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Create escalation</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {list.map((e) => (
            <div key={e.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate">[{e.escalation_type}] {e.reason ?? "—"}</div>
              <Badge variant="secondary" className="text-[9px]">{e.escalation_status}</Badge>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No escalations.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportQualityReviewPanel({ businessId }: { businessId: string }) {
  const [list, setList] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => { const { data } = await (supabase as any).from("support_quality_reviews").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const run = async () => {
    setLoading(true); setErr(null);
    try {
      const { data: drafts } = await (supabase as any).from("support_reply_drafts").select("id").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1);
      const target = drafts?.[0];
      if (!target) throw new Error("No reply drafts to review");
      await invoke("support-quality-review-generate", { business_id: businessId, reply_draft_id: target.id, dry_run: false, confirmation_phrase: "GENERATE SUPPORT QUALITY REVIEW" });
      await reload();
    } catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> Quality Reviews</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" disabled={loading} onClick={run}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Review latest reply draft</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-64 overflow-auto">
          {list.map((r) => (
            <div key={r.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate">grounding {r.grounding_score} · source {r.source_truth_score} · compliance {r.compliance_score}</div>
              <Badge variant="secondary" className={`text-[9px] ${r.passed_internal ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-300"}`}>{r.review_status}</Badge>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No reviews yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportManualExportPanel({ businessId }: { businessId: string }) {
  const [list, setList] = useState<any[]>([]); const [name, setName] = useState(""); const [type, setType] = useState("manual_copy_pack");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const reload = async () => { const { data } = await (supabase as any).from("support_manual_export_packs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50); setList(data ?? []); };
  useEffect(() => { if (businessId) reload(); }, [businessId]);
  const create = async () => {
    setLoading(true); setErr(null);
    try {
      const { data: faqs } = await (supabase as any).from("support_faq_items").select("id").eq("business_id", businessId).limit(50);
      const { data: articles } = await (supabase as any).from("support_knowledge_articles").select("id").eq("business_id", businessId).limit(50);
      await invoke("support-manual-export-create", { business_id: businessId, export_name: name || `Export ${new Date().toISOString().slice(0,10)}`, export_type: type, article_ids: (articles ?? []).map((x: any) => x.id), faq_ids: (faqs ?? []).map((x: any) => x.id), dry_run: false, confirmation_phrase: "CREATE SUPPORT MANUAL EXPORT" });
      setName(""); await reload();
    } catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Upload size={14} className="text-primary" /> Manual Export Packs</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid sm:grid-cols-3 gap-2">
          <Input placeholder="Export name" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2" />
          <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {["faq_page_operator","helpcentre_operator","support_script_pack","zendesk_operator_later","intercom_operator_later","freshdesk_operator_later","website_faq_operator","manual_copy_pack","other"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button size="sm" disabled={loading} onClick={create}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Create export (no publish)</Button>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="space-y-1 max-h-56 overflow-auto">
          {list.map((e) => (
            <div key={e.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
              <div className="truncate">[{e.export_type}] {e.export_name}</div>
              <Badge variant="secondary" className="text-[9px]">{e.export_status}</Badge>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No exports.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportAuditPanel({ businessId }: { businessId: string }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { if (businessId) (supabase as any).from("support_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30).then(({ data }: any) => setList(data ?? [])); }, [businessId]);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Support Audit</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-72 overflow-auto">
          {list.map((a) => (
            <div key={a.id} className="text-[11px] flex justify-between gap-2 p-1.5 rounded border border-border/30 bg-background/40">
              <span className="truncate">{a.action}</span>
              <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
          {!list.length && <div className="text-[11px] text-muted-foreground">No audit events.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportKnowledgeDashboard() {
  const businesses = useBusinesses();
  const [businessId, setBusinessId] = useState<string>(() => typeof window !== "undefined" ? localStorage.getItem("liftor.activeBusinessId") || "" : "");
  useEffect(() => { if (!businessId && businesses[0]) setBusinessId(businesses[0].id); }, [businesses]);
  const [tick, setTick] = useState(0); const bump = () => setTick((t) => t + 1);
  useEffect(() => { /* tick triggers child reloads */ }, [tick]);
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between gap-2"><span>Support Knowledge & Customer Service Agent</span><SafeBadge /></CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="min-w-[240px]">
            <Label className="text-xs">Business</Label>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={businessId} onChange={(e) => { setBusinessId(e.target.value); localStorage.setItem("liftor.activeBusinessId", e.target.value); }}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <span className="text-[11px] text-muted-foreground">Internal-only. No customer replies sent. No live chat. No helpdesk API.</span>
        </CardContent>
      </Card>
      {businessId && (
        <>
          <SupportHealthPanel businessId={businessId} key={`h-${tick}`} />
          <div className="grid lg:grid-cols-2 gap-3">
            <SupportKnowledgeSourcePanel businessId={businessId} onChange={bump} />
            <SupportFAQGeneratorPanel businessId={businessId} onChange={bump} />
            <SupportArticleGeneratorPanel businessId={businessId} onChange={bump} />
            <SupportQuestionCapturePanel businessId={businessId} onChange={bump} />
            <SupportTriagePanel businessId={businessId} onChange={bump} />
            <SupportReplyDraftPanel businessId={businessId} onChange={bump} />
            <SupportEscalationPanel businessId={businessId} onChange={bump} />
            <SupportQualityReviewPanel businessId={businessId} />
            <SupportManualExportPanel businessId={businessId} />
            <SupportLiveConfirmationPanel businessId={businessId} />
          </div>
          <SupportAuditPanel businessId={businessId} />
        </>
      )}
    </div>
  );
}

export function SupportLiveConfirmationPanel({ businessId }: { businessId: string }) {
  const [url, setUrl] = useState(""); const [notes, setNotes] = useState(""); const [articleId, setArticleId] = useState("");
  const [articles, setArticles] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false);
  useEffect(() => { if (businessId) (supabase as any).from("support_knowledge_articles").select("id,article_title,title").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setArticles(data ?? [])); }, [businessId]);
  const confirm = async () => {
    setLoading(true); setErr(null); setOk(false);
    try { await invoke("support-live-confirmation-record", { business_id: businessId, article_id: articleId || undefined, external_url: url || undefined, confirmation_notes: notes || undefined, dry_run: false, confirmation_phrase: "CONFIRM SUPPORT CONTENT MANUALLY PUBLISHED" }); setOk(true); setUrl(""); setNotes(""); setArticleId(""); }
    catch (e: any) { setErr(e.message ?? String(e)); } finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> Live Confirmation (manual)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={articleId} onChange={(e) => setArticleId(e.target.value)}>
          <option value="">— article (optional) —</option>
          {articles.map((a) => <option key={a.id} value={a.id}>{a.article_title ?? a.title}</option>)}
        </select>
        <Input placeholder="External URL where article is now live" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[48px] text-xs" />
        <Button size="sm" disabled={loading} onClick={confirm}>{loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Record manual publish</Button>
        {ok && <div className="text-xs text-green-400">Recorded — internal status only.</div>}
        {err && <div className="text-xs text-destructive">{err}</div>}
      </CardContent>
    </Card>
  );
}