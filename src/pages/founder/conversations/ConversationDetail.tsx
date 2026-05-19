import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Bot, User, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LiftorBrainInboundReplyPanel from "@/components/founder/brain/LiftorBrainInboundReplyPanel";
import { Brain } from "lucide-react";

type Conv = any; type Msg = any; type Action = any; type Contact = any;
type Draft = any;

const ConversationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [conv, setConv] = useState<Conv | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [brainOpen, setBrainOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
    setConv(c);
    if (c) {
      const [{ data: ct }, { data: m }, { data: a }, { data: d }] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", c.contact_id).maybeSingle(),
        supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }),
        supabase.from("ai_actions").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("ai_drafts").select("*").eq("conversation_id", id).order("created_at", { ascending: false }),
      ]);
      setContact(ct); setMsgs(m ?? []); setActions(a ?? []); setDrafts(d ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const clearEscalation = async () => {
    if (!conv) return;
    await supabase.from("conversations").update({ escalation_pending: false, escalation_reason: "" }).eq("id", conv.id);
    toast.success("Escalation cleared");
    load();
  };

  const sendDraft = async (draft: Draft) => {
    setBusy(draft.id);
    const edited = editing[draft.id];
    const { data, error } = await supabase.functions.invoke("outreach-send-draft", {
      body: { draft_id: draft.id, edited_body: edited ?? null },
    });
    setBusy(null);
    const p = (data ?? {}) as { ok?: boolean; error?: string };
    if (error || !p.ok) toast.error(p.error ?? error?.message ?? "Send failed");
    else { toast.success("Reply sent"); load(); }
  };

  const rejectDraft = async (draft: Draft) => {
    setBusy(draft.id);
    await supabase.from("ai_drafts").update({ status: "rejected" }).eq("id", draft.id);
    setBusy(null); toast.success("Draft rejected"); load();
  };

  if (loading) return <FounderLayout><div className="p-6 text-sm text-muted-foreground">Loading…</div></FounderLayout>;
  if (!conv) return <FounderLayout><div className="p-6 text-sm">Not found.</div></FounderLayout>;

  const pendingDrafts = drafts.filter((d) => d.status === "pending");

  return (
    <FounderLayout>
      <div className="max-w-5xl space-y-6">
        <Link to="/founder/conversations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All conversations
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{contact?.name || contact?.email || "Conversation"}</h1>
            <p className="text-sm text-muted-foreground">
              {contact?.email} · {contact?.company || "—"} · {conv.business_name || "—"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant="outline">{conv.status}</Badge>
            <Badge variant="outline">Contact: {contact?.status}</Badge>
            <Button size="sm" variant="outline" onClick={() => setBrainOpen(true)} className="gap-1">
              <Brain className="h-3.5 w-3.5" /> Draft reply with Liftor Brain
            </Button>
          </div>
        </div>

        <Dialog open={brainOpen} onOpenChange={setBrainOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Liftor Brain — Inbound reply drafting</DialogTitle></DialogHeader>
            <LiftorBrainInboundReplyPanel
              conversationId={conv.id}
              crmContactId={contact?.id ?? null}
              initialSenderEmail={contact?.email ?? ""}
              initialSubject={msgs.filter((m: any) => m.direction === "inbound").slice(-1)[0] ? `Re: conversation ${conv.id.slice(0,8)}` : ""}
              initialBody={msgs.filter((m: any) => m.direction === "inbound").slice(-1)[0]?.content ?? ""}
            />
          </DialogContent>
        </Dialog>

        {conv.escalation_pending && (
          <Card className="tech-card p-4 border-destructive/40 bg-destructive/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-medium">Escalation pending</div>
                  <div className="text-sm text-muted-foreground">Reasons: {conv.escalation_reason || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">AI did not auto-reply. Handle this thread manually before clearing.</div>
                </div>
              </div>
              <Button size="sm" onClick={clearEscalation}>Clear escalation</Button>
            </div>
          </Card>
        )}

        {pendingDrafts.length > 0 && (
          <Card className="tech-card p-4 border-primary/40 bg-primary/5 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <div className="font-medium">AI suggested {pendingDrafts.length === 1 ? "reply" : "replies"} — approval required</div>
            </div>
            {pendingDrafts.map((d) => (
              <div key={d.id} className="space-y-2 border-t border-border/40 pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {d.classification && <Badge variant="outline">{d.classification}</Badge>}
                  {(d.suggested_tags ?? []).map((t: string) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                  <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                </div>
                <Textarea
                  className="min-h-[120px] text-sm"
                  defaultValue={d.draft_body}
                  onChange={(e) => setEditing({ ...editing, [d.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => sendDraft(d)} disabled={busy === d.id}>
                    <Send className="h-3.5 w-3.5 mr-1" /> {busy === d.id ? "Sending…" : "Approve & send"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectDraft(d)} disabled={busy === d.id}>
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}

        <Card className="tech-card p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Thread</div>
          {msgs.length === 0 && <div className="text-sm text-muted-foreground">No messages yet.</div>}
          {msgs.map((m: any) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg border ${
                m.direction === "inbound"
                  ? "border-border/50 bg-secondary/40"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                {m.direction === "inbound" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                <span>{m.direction === "inbound" ? "Prospect" : m.ai_generated ? "AI reply" : "Manual reply"}</span>
                <span>·</span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </Card>

        <Card className="tech-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">AI actions</div>
          {actions.length === 0 && <div className="text-sm text-muted-foreground">No AI actions yet.</div>}
          <div className="space-y-2">
            {actions.map((a: any) => (
              <div key={a.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/30 pb-2 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{a.action_type}</Badge>
                    {a.classification && <Badge variant="outline">{a.classification}</Badge>}
                    <Badge variant={a.status === "success" ? "outline" : "destructive"}>{a.status}</Badge>
                  </div>
                  {a.reply_preview && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.reply_preview}</div>}
                  {a.error_message && <div className="text-xs text-destructive mt-1">{a.error_message}</div>}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {a.tokens_used ? `${a.tokens_used} tok` : ""}<br />
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default ConversationDetail;