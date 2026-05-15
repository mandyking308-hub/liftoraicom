import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, ShieldCheck, RefreshCw, Sparkles, Lock, AlertTriangle } from "lucide-react";

type PreviewResp = {
  ok: boolean;
  contact?: { id: string; name?: string; email?: string; company?: string } | null;
  business?: { id: string; name?: string } | null;
  detected_intent: string;
  intent_confidence: number;
  tone_profile: string;
  recommended_reply_strategy: string;
  customer_summary: string;
  context_summary: string;
  timeline_sample: any[];
  draft: { subject: string; body: string };
  risk_flags: string[];
  compliance_flags: string[];
  founder_review_required: boolean;
  send_allowed: boolean;
  save_disabled_reason: string;
};

export default function AIConversationDraftingPanel() {
  const [conversationId, setConversationId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [interactionId, setInteractionId] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ["acdr-conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, business_name, contact_id, last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: tones } = useQuery({
    queryKey: ["ai-reply-tone-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_reply_tone_profiles")
        .select("tone_key,label,active")
        .eq("active", true)
        .order("tone_key");
      return data ?? [];
    },
  });

  const { data: recentDrafts } = useQuery({
    queryKey: ["ai-conv-draft-reviews-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_conversation_draft_reviews")
        .select("id,detected_intent,approval_status,tone_profile,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (preview?.tone_profile && !tone) setTone(preview.tone_profile);
  }, [preview?.tone_profile]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-conversation-draft-preview", {
        body: {
          conversation_id: conversationId || undefined,
          contact_id: contactId || undefined,
          interaction_id: interactionId || undefined,
        },
      });
      if (error) throw error;
      setPreview(data as PreviewResp);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const intentClass = (c: number) =>
    c >= 0.8 ? "bg-green-500/15 text-green-400 border-green-500/30"
    : c >= 0.5 ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot size={18} className="text-primary" /> AI Conversation Drafting V2 (preview)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send · No-Apollo · No-Smartlead-POST
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <Lock size={10} className="mr-1" /> Save disabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Conversation</label>
            <Select value={conversationId} onValueChange={(v) => { setConversationId(v); setContactId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pick recent conversation" /></SelectTrigger>
              <SelectContent>
                {(conversations ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name ?? c.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Contact ID (optional)</label>
            <input
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="uuid"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Interaction ID (optional)</label>
            <input
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={interactionId}
              onChange={(e) => setInteractionId(e.target.value)}
              placeholder="uuid"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runPreview} disabled={loading}>
            {loading ? <RefreshCw size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
            Generate draft preview
          </Button>
          <span className="text-[11px] text-muted-foreground">Read-only. No drafts saved. No emails sent.</span>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-xs p-2 flex items-center gap-2">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Intent</p>
                <p className="text-sm font-semibold">{preview.detected_intent}</p>
                <Badge variant="outline" className={`mt-1 text-[10px] ${intentClass(preview.intent_confidence)}`}>
                  conf {Math.round(preview.intent_confidence * 100)}%
                </Badge>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Tone</p>
                <p className="text-sm font-semibold">{preview.tone_profile}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Risk flags</p>
                <p className="text-sm font-semibold">{preview.risk_flags.length}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Compliance flags</p>
                <p className="text-sm font-semibold">{preview.compliance_flags.length}</p>
              </div>
            </div>

            <div className="rounded-md border border-border/50 p-2 bg-card/40 space-y-1">
              <p className="text-[10px] uppercase text-muted-foreground">Customer / context</p>
              <p className="text-xs">{preview.customer_summary}</p>
              <p className="text-xs text-muted-foreground">{preview.context_summary}</p>
              <p className="text-xs"><span className="text-muted-foreground">Strategy: </span>{preview.recommended_reply_strategy}</p>
            </div>

            <div className="rounded-md border border-border/50 p-2 bg-card/40 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase text-muted-foreground">Draft reply</p>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-7 w-[220px] text-xs">
                    <SelectValue placeholder="Override tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tones ?? []).map((t: any) => (
                      <SelectItem key={t.tone_key} value={t.tone_key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs" defaultValue={preview.draft.subject} readOnly />
              <Textarea value={preview.draft.body} readOnly rows={8} className="text-xs font-mono" />
            </div>

            {(preview.risk_flags.length > 0 || preview.compliance_flags.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {preview.risk_flags.length > 0 && (
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2">
                    <p className="text-[10px] uppercase text-yellow-400">Risk flags</p>
                    <ul className="text-xs text-yellow-300/90 list-disc pl-4">
                      {preview.risk_flags.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {preview.compliance_flags.length > 0 && (
                  <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-2">
                    <p className="text-[10px] uppercase text-orange-400">Compliance flags</p>
                    <ul className="text-xs text-orange-300/90 list-disc pl-4">
                      {preview.compliance_flags.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" disabled title="Save disabled — feature flag AI_DRAFT_SAVE_ENABLED required">
                <Lock size={12} className="mr-1" /> Save draft (disabled)
              </Button>
              <Button size="sm" variant="outline" disabled title="Send disabled — preview-only operating mode">
                <Lock size={12} className="mr-1" /> Send (disabled)
              </Button>
              <span className="text-[11px] text-muted-foreground">Founder approval required before any future send.</span>
            </div>
          </div>
        )}

        <div className="rounded-md border border-border/50 p-2 bg-card/30">
          <p className="text-[10px] uppercase text-muted-foreground mb-1">Recent draft reviews ({recentDrafts?.length ?? 0})</p>
          {(recentDrafts ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No persisted drafts yet — save is feature-flagged off.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {recentDrafts!.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{d.detected_intent ?? "—"} · {d.tone_profile ?? "—"}</span>
                  <Badge variant="outline" className="text-[10px]">{d.approval_status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}