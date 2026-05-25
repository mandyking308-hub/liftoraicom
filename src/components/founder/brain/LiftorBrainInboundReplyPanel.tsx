import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Brain, Lock, AlertTriangle, Loader2, Mail, ShieldCheck, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  businessId?: string | null;
  inboundMessageId?: string | null;
  conversationId?: string | null;
  crmContactId?: string | null;
  initialSenderEmail?: string;
  initialSubject?: string;
  initialBody?: string;
}

const CONFIRMATION_PHRASE = "CREATE INBOUND EMAIL REPLY DRAFT";

export default function LiftorBrainInboundReplyPanel({
  businessId = null, inboundMessageId = null, conversationId = null, crmContactId = null,
  initialSenderEmail = "", initialSubject = "", initialBody = "",
}: Props) {
  const [providerStatus, setProviderStatus] = useState<"loading"|"configured"|"not_configured"|"error">("loading");
  const [senderEmail, setSenderEmail] = useState(initialSenderEmail);
  const [senderName, setSenderName] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [bodyText, setBodyText] = useState(initialBody);
  const [tone, setTone] = useState("warm, confident, concise");
  const [goal, setGoal] = useState("");
  const [phrase, setPhrase] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentDrafts, setRecentDrafts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("liftor-brain-provider-check", {
          body: { provider_key: "openai", write_audit: false },
        });
        setProviderStatus(error ? "error" : (data?.can_call_ai ? "configured" : "not_configured"));
      } catch { setProviderStatus("error"); }
    })();
    loadRecent();
  }, []);

  const loadRecent = async () => {
    const { data } = await supabase.from("liftor_brain_drafts")
      .select("id,draft_type,subject,title,approval_status,risk_warnings,created_at,business_id")
      .eq("draft_type", "inbound_email_reply")
      .order("created_at", { ascending: false }).limit(5);
    setRecentDrafts(data ?? []);
  };

  const callFn = async (saveMode: boolean) => {
    if (!bodyText.trim() && !inboundMessageId && !conversationId) {
      toast({ title: "Source required", description: "Paste an inbound body or open from a conversation.", variant: "destructive" });
      return;
    }
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("liftor-brain-draft-inbound-reply", {
        body: {
          business_id: businessId,
          inbound_message_id: inboundMessageId,
          conversation_id: conversationId,
          crm_contact_id: crmContactId,
          manual_sender_email: senderEmail || null,
          manual_sender_name: senderName || null,
          manual_subject: subject || null,
          manual_body: bodyText || null,
          requested_tone: tone,
          reply_goal: goal,
          include_thread_history: true,
          dry_run: !saveMode,
          save_draft: saveMode,
          create_founder_approval: saveMode,
          confirmation_phrase: saveMode ? phrase : "",
        },
      });
      if (error) throw error;
      setResult(data);
      if (saveMode) {
        if (data?.saved_draft_id) {
          toast({ title: "Internal draft saved", description: "Reply is internal-only. No email was sent." });
          loadRecent();
        } else if (data?.status === "BLOCKED_CONFIRMATION_REQUIRED") {
          toast({ title: "Confirmation required", description: data.message, variant: "destructive" });
        }
      }
    } catch (e: any) {
      toast({ title: "Brain drafting error", description: e?.message ?? "Failed", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const providerBadge =
    providerStatus === "configured" ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">OpenAI configured</Badge> :
    providerStatus === "not_configured" ? <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">OpenAI not configured</Badge> :
    providerStatus === "error" ? <Badge variant="destructive">Provider check error</Badge> :
    <Badge variant="secondary">Checking…</Badge>;

  const preview = result?.draft_preview;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail size={18} className="text-primary" />
            Inbound reply drafting
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {providerBadge}
            <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 gap-1">
              <Lock size={12} /> Send locked
            </Badge>
            <Badge variant="outline" className="text-xs gap-1"><ShieldCheck size={12} /> Founder approval required</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Paste an inbound message or open from a conversation. Liftor Brain drafts the reply internally. No SMTP, no Smartlead, no queue send.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {providerStatus === "not_configured" && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-xs p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5" />
            <div>Lovable AI Gateway not reachable. Drafting is fail-closed until <code className="px-1 rounded bg-background/50">LOVABLE_API_KEY</code> is available (auto-provisioned by Lovable).</div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From email</Label>
            <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="prospect@example.com" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">From name</Label>
            <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Jane Doe" className="h-8 text-xs" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Re: your enquiry" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Inbound message body</Label>
          <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="Paste the full inbound email body here…" className="min-h-[120px] text-sm" />
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Tone</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Reply goal (optional)</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. answer their question and offer a call" className="h-8 text-xs" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="h-8 text-xs gap-1" disabled={working} onClick={() => callFn(false)}>
            {working ? <Loader2 size={12} className="animate-spin" /> : <Brain size={14} />} Generate draft preview
          </Button>
        </div>

        {preview && (
          <div className="rounded-md border border-border p-3 bg-card/30 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-medium">Draft preview</div>
              <Badge variant="outline" className="text-[10px]">type: inbound_email_reply</Badge>
              <Badge variant="outline" className="text-[10px]">risk: {result?.risk_level ?? "low"}</Badge>
              <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30 gap-1"><Lock size={10}/> Not sent</Badge>
            </div>
            {preview.subject && <div className="text-xs text-muted-foreground">Subject: {preview.subject}</div>}
            <pre className="text-xs whitespace-pre-wrap leading-relaxed">{preview.body}</pre>
            {preview.rationale && <div className="text-[11px] text-muted-foreground border-t border-border pt-2">Rationale: {preview.rationale}</div>}
          </div>
        )}

        {result && (
          <div className="grid md:grid-cols-2 gap-2">
            <DetailBlock title="Missing context" items={result.missing_context ?? []} empty="No gaps reported." warning />
            <DetailBlock title="Risk warnings" items={result.risk_warnings ?? []} empty="No risks reported." warning />
          </div>
        )}

        {preview && providerStatus === "configured" && (
          <div className="rounded-md border border-border p-3 bg-card/20 space-y-2">
            <div className="text-xs font-medium">Save internal draft</div>
            <div className="text-[11px] text-muted-foreground">
              Type the confirmation phrase exactly to save. The draft is internal-only; sending happens later through the founder approval and external email gate.
            </div>
            <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRMATION_PHRASE} className="h-8 text-xs font-mono" />
            <Button size="sm" className="h-8 text-xs gap-1" disabled={working || phrase !== CONFIRMATION_PHRASE} onClick={() => callFn(true)}>
              <Save size={12} /> Save internal draft & request founder review
            </Button>
            {result?.saved_draft_id && (
              <div className="text-[11px] text-green-400">
                Saved draft id: {result.saved_draft_id.slice(0, 8)}…
                {result.founder_approval_id ? ` · approval ${result.founder_approval_id.slice(0,8)}…` : (result.approval_warning ? ` · ${result.approval_warning}` : "")}
              </div>
            )}
          </div>
        )}

        {recentDrafts.length > 0 && (
          <div className="rounded-md border border-border p-3 bg-card/20">
            <div className="text-xs font-medium mb-2">Recent inbound reply drafts (internal only)</div>
            <ul className="text-[11px] space-y-1">
              {recentDrafts.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{d.approval_status}</Badge>
                  <span className="truncate">{d.subject || d.title || d.id.slice(0,8)}</span>
                  <span className="text-muted-foreground ml-auto">{new Date(d.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <div className="text-[10px] text-muted-foreground mt-2">Not sent. Send happens only via founder approval + external email gate.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailBlock({ title, items, empty, warning }: { title: string; items: string[]; empty: string; warning?: boolean }) {
  return (
    <div className="rounded-md border border-border p-3 bg-card/30">
      <div className="text-xs font-medium mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">{empty}</div>
      ) : (
        <ul className={`text-[11px] space-y-1 ${warning ? "text-yellow-300/90" : "text-foreground/80"}`}>
          {items.slice(0, 8).map((it, i) => <li key={i}>• {it}</li>)}
          {items.length > 8 && <li className="text-muted-foreground">+ {items.length - 8} more</li>}
        </ul>
      )}
    </div>
  );
}