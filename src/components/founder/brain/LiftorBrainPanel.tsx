import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Lock, AlertTriangle, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  meta?: any;
};

const MODES = [
  { v: "answer", l: "Ask" },
  { v: "what_should_i_do_now", l: "What should I do now?" },
  { v: "explain_blocker", l: "Explain blocker" },
  { v: "diagnostic_summary", l: "Diagnostic summary" },
  { v: "draft_founder_brief", l: "Draft founder brief" },
  { v: "draft_social_content", l: "Draft social content" },
  { v: "draft_revenue_plan", l: "Draft revenue plan" },
  { v: "draft_support_reply", l: "Draft support reply" },
  { v: "draft_customer_success_plan", l: "Draft customer success plan" },
];

interface Props {
  businessId?: string | null;
  businessName?: string | null;
}

export default function LiftorBrainPanel({ businessId = null, businessName }: Props) {
  const [providerStatus, setProviderStatus] = useState<"loading" | "configured" | "not_configured" | "error">("loading");
  const [defaultModel, setDefaultModel] = useState<string>("gpt-5.5");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("answer");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [saveDraft, setSaveDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("liftor-brain-provider-check", {
          body: { provider_key: "openai", write_audit: false },
        });
        if (cancelled) return;
        if (error) { setProviderStatus("error"); return; }
        setProviderStatus(data?.can_call_ai ? "configured" : "not_configured");
        if (data?.default_model) setDefaultModel(data.default_model);
      } catch {
        if (!cancelled) setProviderStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  const newSession = () => {
    setSessionId(null);
    setMessages([]);
    setLastResult(null);
  };

  const send = async (buildContextOnly = false) => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const localUser: ChatMsg = { role: "user", text };
    setMessages((m) => [...m, localUser]);
    setInput("");
    try {
      const fnName = buildContextOnly ? "liftor-brain-context-builder" : "liftor-brain-chat";
      const body: any = buildContextOnly
        ? { business_id: businessId, context_type: businessId ? "selected_business" : "command_centre", include_diagnostics: includeDiagnostics, session_id: sessionId }
        : {
            session_id: sessionId, business_id: businessId,
            user_message: text, requested_mode: mode,
            context_type: businessId ? "selected_business" : "command_centre",
            include_diagnostics: includeDiagnostics,
            allow_internal_tools: true,
            save_draft: saveDraft,
          };
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      setLastResult(data);
      if (buildContextOnly) {
        setMessages((m) => [...m, {
          role: "assistant",
          text: `Context pack built. ${data?.missing_context?.length ?? 0} missing items, ${data?.risk_warnings?.length ?? 0} risks. Pack id: ${data?.context_pack_id ?? "n/a"}.`,
          meta: { contextOnly: true, missing: data?.missing_context, risks: data?.risk_warnings },
        }]);
      } else {
        if (data?.session_id) setSessionId(data.session_id);
        setMessages((m) => [...m, { role: "assistant", text: data?.answer ?? "(no answer)", meta: data }]);
        if (data?.status === "PARTIAL_PROVIDER_NOT_CONFIGURED") {
          setProviderStatus("not_configured");
        }
      }
    } catch (e: any) {
      toast({ title: "Liftor Brain error", description: e?.message ?? "Failed", variant: "destructive" });
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${e?.message ?? "failed"}` }]);
    } finally {
      setSending(false);
    }
  };

  const providerBadge =
    providerStatus === "configured" ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">OpenAI configured</Badge> :
    providerStatus === "not_configured" ? <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">OpenAI not configured</Badge> :
    providerStatus === "error" ? <Badge variant="destructive">Provider check error</Badge> :
    <Badge variant="secondary">Checking provider…</Badge>;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain size={18} className="text-primary" />
              Liftor Brain / Mandy Co-Pilot
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {providerBadge}
              <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 gap-1">
                <Lock size={12} /> External actions locked
              </Badge>
              <Badge variant="outline" className="text-xs">model: {defaultModel}</Badge>
              {businessName ? <Badge variant="outline" className="text-xs">Business: {businessName}</Badge> : <Badge variant="outline" className="text-xs">Portfolio-wide</Badge>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Central AI backbone for all businesses. Drafts and recommendations only. No external sends, no spend, no publishing.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {providerStatus === "not_configured" && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-xs p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5" />
              <div>
                OpenAI provider not configured. Add <code className="px-1 rounded bg-background/50">OPENAI_API_KEY</code> as a Supabase Edge Function secret to enable the Brain. Until then, asking will return a fail-closed message — no model call is made.
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px]">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => <SelectItem key={m.v} value={m.v} className="text-xs">{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="brain-diag" checked={includeDiagnostics} onCheckedChange={setIncludeDiagnostics} />
              <Label htmlFor="brain-diag" className="text-xs">Include diagnostics</Label>
            </div>
            {mode.startsWith("draft_") && (
              <div className="flex items-center gap-2">
                <Switch id="brain-save" checked={saveDraft} onCheckedChange={setSaveDraft} />
                <Label htmlFor="brain-save" className="text-xs">Save draft</Label>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={newSession} disabled={sending}>New session</Button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card/30">
            <ScrollArea className="h-[280px] p-3">
              {messages.length === 0 ? (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  Ask Liftor Brain what to do next, why something is blocked, or to prepare an internal brief.
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "text-foreground" : "text-foreground/90"}>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                        {m.role === "user" ? "You" : "Liftor Brain"}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
                    </div>
                  ))}
                  {sending && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Liftor Brain is thinking…
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Liftor Brain… (e.g. ‘What should I do next across all businesses?’)"
            className="min-h-[70px] text-sm"
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => send(false)} disabled={sending || !input.trim()}>
              <Brain size={14} /> Ask Liftor Brain
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => send(true)} disabled={sending || !input.trim()}>
              Build context only
            </Button>
            <div className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck size={12} /> Server-side OpenAI only · founder approval required for any draft action
            </div>
          </div>

          {lastResult && (
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              <DetailBlock title="Suggested actions" items={(lastResult.suggested_actions ?? []).map((a: any) => `${a.priority?.toUpperCase?.() ?? ""} · ${a.title}${a.recommended_route ? ` (${a.recommended_route})` : ""}`)} empty="No actions suggested." />
              <DetailBlock title="Missing context" items={lastResult.missing_context ?? []} empty="No gaps reported." warning />
              <DetailBlock title="Risk warnings" items={lastResult.risk_warnings ?? []} empty="No risks reported." warning />
              {lastResult.tool_results?.length ? (
                <DetailBlock title="Tool results" items={lastResult.tool_results.map((t: any) => `${t.tool_key} → ${t.status}`)} empty="No tools used." />
              ) : null}
              {lastResult.created_draft_ids?.length ? (
                <DetailBlock title="Drafts created" items={lastResult.created_draft_ids.map((id: string) => `Draft ${id.slice(0, 8)}…`)} empty="No drafts saved." />
              ) : null}
              {lastResult.draft_preview ? (
                <div className="md:col-span-3 rounded-md border border-border p-3 bg-card/30">
                  <div className="text-xs font-medium mb-1">Draft preview ({lastResult.draft_preview.draft_type})</div>
                  {lastResult.draft_preview.subject && <div className="text-xs text-muted-foreground mb-1">Subject: {lastResult.draft_preview.subject}</div>}
                  <pre className="text-xs whitespace-pre-wrap leading-relaxed">{lastResult.draft_preview.body}</pre>
                </div>
              ) : null}
            </div>
          )}

          <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span>External sends · publishing · spend · charges · invites · provider mutations: LOCKED</span>
            <span>OpenAI calls happen server-side only via the Liftor Brain edge function.</span>
            <span>Every session, message, tool call and draft is audited.</span>
          </div>
        </CardContent>
      </Card>
    </div>
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