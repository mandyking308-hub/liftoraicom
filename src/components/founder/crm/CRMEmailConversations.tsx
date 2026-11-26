import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { reviewableReply, threadKey } from "../../../../supabase/functions/_shared/crmReplyDrafting";

type Scope = { business_id: string; provider_campaign_id: string; provider_lead_id: string };
type Thread = Scope & { business_name: string; campaign_name: string };
type Message = Scope & { id: string; direction: string; reply_kind: string | null; contact_id: string | null; from_email: string | null; to_email: string | null; subject: string | null; body_html: string | null; sent_at: string | null; created_at: string };
type Draft = Scope & { id: string; body: string; status: string; agent_summary: string | null; source_reply_row_id: string | null; approved_at: string | null; sent_at: string | null; created_at: string };
type Data = { threads: Thread[]; messages: Message[]; drafts: Draft[] };
const time = (v: string | null) => v ? new Date(v).toLocaleString("en-GB") : "Time not reported";

function plainBody(html: string | null) {
  if (!html) return "Message body not supplied by Smartlead.";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object").forEach((node) => node.remove());
  doc.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  doc.querySelectorAll("p,div,tr").forEach((node) => node.append("\n"));
  return doc.body.textContent?.trim() || "Message body not supplied by Smartlead.";
}

export default function CRMEmailConversations({ contactId, initialScope }: { contactId: string; initialScope?: Scope }) {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState(initialScope ? threadKey(initialScope) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null); setEdits({});
    void supabase.rpc("crm_customer_conversations", { p_contact_id: contactId }).then(({ data: response, error: failure }) => {
      if (cancelled) return;
      if (failure) { setError("Could not load this customer's conversations. Please update again."); return; }
      const next = response as unknown as Data;
      setData(next);
      setSelected((old) => next.threads.some((t) => threadKey(t) === old) ? old : next.threads[0] ? threadKey(next.threads[0]) : "");
    });
    return () => { cancelled = true; };
  }, [contactId, revision]);

  const thread = data?.threads.find((t) => threadKey(t) === selected);
  const messages = (data?.messages ?? []).filter((m) => threadKey(m) === selected);
  const drafts = (data?.drafts ?? []).filter((d) => threadKey(d) === selected);
  const latest = [...messages].reverse().find((m) => m.direction === "REPLY");
  const canDraft = !!latest && reviewableReply(latest);

  async function prepare() {
    if (!thread || !canDraft) return;
    setBusy("prepare");
    try {
      const { data: result, error: failure } = await supabase.functions.invoke("inbox-agent-reply-handover", {
        body: { action: "prepare_reply", business_id: thread.business_id, campaign_id: thread.provider_campaign_id, lead_id: thread.provider_lead_id },
      });
      if (failure) {
        let detail = failure.message;
        if (failure instanceof FunctionsHttpError) { const body = await failure.context.json().catch(() => ({})); detail = body.error ?? detail; }
        throw new Error(detail);
      }
      if (result?.error) throw new Error(result.error);
      toast.success(result.reused ? "Existing response draft opened" : "AI response saved for review");
      refresh();
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Could not prepare a response"); }
    finally { setBusy(null); }
  }

  async function syncConversation() {
    if (!thread) return;
    setBusy("sync");
    try {
      const { data: result, error: failure } = await supabase.functions.invoke("smartlead-campaign-sync", { body: {
        action: "sync_thread", business_id: thread.business_id, campaign_id: thread.provider_campaign_id, lead_id: thread.provider_lead_id,
      } });
      if (failure || result?.ok === false) throw new Error(result?.error ?? "Could not update this conversation from Smartlead.");
      toast.success("Conversation updated from Smartlead"); refresh();
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Conversation update failed"); }
    finally { setBusy(null); }
  }

  async function review(draft: Draft, decision: "approved" | "rejected") {
    setBusy(draft.id);
    const { error: failure } = await supabase.rpc("crm_review_reply", { p_draft_id: draft.id, p_expected_body: draft.body, p_decision: decision });
    setBusy(null);
    if (failure) { toast.error(failure.message); return; }
    toast.success(decision === "approved" ? "Response approved — not sent" : "Response rejected");
    refresh();
  }

  async function callSync(draft: Draft, action: "send_reply" | "verify_reply") {
    if (!thread) return null;
    const { data: result, error: failure } = await supabase.functions.invoke("smartlead-campaign-sync", { body: {
      action, business_id: thread.business_id, campaign_id: thread.provider_campaign_id, draft_id: draft.id,
      ...(action === "send_reply" ? { confirmation: "SEND THIS REPLY" } : {}),
    } });
    let detail: string | undefined = result?.error;
    if (failure instanceof FunctionsHttpError) { const b = await failure.context.json().catch(() => ({})); detail = b.error ?? failure.message; }
    if (failure || result?.ok === false) throw new Error(detail === "reply_sending_not_enabled" ? "Reply sending is not switched on yet." : detail ?? "Request failed");
    return result;
  }

  async function send(draft: Draft) {
    if (busy) return; // one click only
    if (!window.confirm("Send this reply now from the original mailbox, in the same email thread?")) return;
    setBusy(draft.id);
    try { await callSync(draft, "send_reply"); toast.success("Reply sent — confirmed by Smartlead"); }
    catch (f) { toast.error(f instanceof Error ? f.message : "Send failed"); }
    finally { setBusy(null); refresh(); }
  }

  async function verify(draft: Draft) {
    setBusy(draft.id);
    try { const r = await callSync(draft, "verify_reply"); toast.success(r?.verified === "sent" ? "Confirmed: the reply was sent" : "Not sent — you can send it again"); }
    catch (f) { toast.error(f instanceof Error ? f.message : "Check failed"); }
    finally { setBusy(null); refresh(); }
  }

  async function saveVersion(draft: Draft) {
    const body = edits[draft.id]?.trim();
    if (!body) return;
    setBusy(draft.id);
    const { error: failure } = await supabase.rpc("crm_save_reply_version", { p_draft_id: draft.id, p_expected_body: draft.body, p_body: body });
    setBusy(null);
    if (failure) { toast.error(failure.message); return; }
    toast.success("Edited response saved; original kept"); refresh();
  }

  return <section className="min-w-0 space-y-4" aria-label="Customer email conversations">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Email conversations</h3>
      <Button size="sm" variant="ghost" aria-label="Update conversations" onClick={refresh} disabled={!!busy}><RefreshCw className="mr-2 h-4 w-4" />Update</Button>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !data ? <p className="text-sm text-muted-foreground">Loading conversations…</p> : !data.threads.length ? <p className="text-sm text-muted-foreground">No saved email conversation for this person yet.</p> : <>
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-auto min-h-10 min-w-0 text-left [&>span]:whitespace-normal [&>span]:break-words"><SelectValue /></SelectTrigger>
        <SelectContent>{data.threads.map((t) => <SelectItem value={threadKey(t)} key={threadKey(t)}>{t.business_name} · {t.campaign_name} · #{t.provider_campaign_id}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={syncConversation} disabled={!!busy}><RefreshCw className="mr-2 h-4 w-4" />{busy === "sync" ? "Syncing…" : "Sync conversation"}</Button></div>
      <ol className="space-y-3">
        {messages.map((m) => <li key={m.id} className="min-w-0 space-y-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <Badge variant={m.reply_kind === "bounce" ? "destructive" : m.direction === "REPLY" ? "default" : "secondary"}>{m.reply_kind === "bounce" ? "Bounce notice" : m.reply_kind === "auto_reply" ? "Automatic reply" : m.direction === "REPLY" ? "Customer replied" : "Email sent"}</Badge>
            <span className="text-muted-foreground">{time(m.sent_at)}</span>
          </div>
          <div className="break-words text-sm font-medium">{m.subject}</div>
          <div className="break-all text-xs text-muted-foreground">{m.from_email ?? "Sender not reported"} → {m.to_email ?? "Recipient not reported"}</div>
          <div className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{plainBody(m.body_html)}</div>
        </li>)}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Response drafts</h4>
        <Button size="sm" variant="outline" onClick={prepare} disabled={!canDraft || !!busy}><Sparkles className="mr-2 h-4 w-4" />{busy === "prepare" ? "Preparing…" : "Prepare AI response"}</Button>
      </div>
      {drafts.map((draft) => {
        const changed = edits[draft.id] !== undefined && edits[draft.id] !== draft.body;
        const stale = draft.source_reply_row_id !== latest?.id;
        return <div key={draft.id} className="min-w-0 space-y-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><Badge variant="outline">{draft.status === "approved" ? "Approved — not sent" : draft.status === "draft" ? "Awaiting review" : draft.status === "sent" ? "Sent — provider confirmed" : draft.status === "send_unknown" || draft.status === "sending" ? "Sending outcome needs checking" : draft.status}</Badge><span className="text-muted-foreground">{time(draft.sent_at ?? draft.approved_at ?? draft.created_at)}</span></div>
          {draft.agent_summary && <p className="break-words text-sm text-muted-foreground">{draft.agent_summary}</p>}
          {draft.status === "draft" ? <Textarea aria-label="Response draft" value={edits[draft.id] ?? draft.body} onChange={(e) => setEdits((old) => ({ ...old, [draft.id]: e.target.value }))} className="min-h-36" maxLength={20000} /> : <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{draft.body}</p>}
          {draft.status === "draft" && <div className="flex flex-wrap gap-2">
            {changed ? <Button size="sm" onClick={() => saveVersion(draft)} disabled={!!busy || !edits[draft.id]?.trim()}>Save edited version</Button> : <Button size="sm" onClick={() => review(draft, "approved")} disabled={!!busy || stale || !canDraft}><Check className="mr-2 h-4 w-4" />Approve draft</Button>}
            <Button size="sm" variant="outline" onClick={() => review(draft, "rejected")} disabled={!!busy}><X className="mr-2 h-4 w-4" />Reject</Button>
            {stale && <span className="text-xs text-muted-foreground">A newer reply has arrived.</span>}
          </div>}
          {draft.status === "approved" && <Button size="sm" onClick={() => send(draft)} disabled={!!busy || stale}><Send className="mr-2 h-4 w-4" />{busy === draft.id ? "Sending…" : "Send"}</Button>}
          {(draft.status === "send_unknown" || draft.status === "sending") && <Button size="sm" variant="outline" onClick={() => verify(draft)} disabled={!!busy}><RefreshCw className="mr-2 h-4 w-4" />Check if it was sent</Button>}
        </div>;
      })}
    </>}
  </section>;
}