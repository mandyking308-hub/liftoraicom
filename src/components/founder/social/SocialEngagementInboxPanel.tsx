import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Inbox, MessageSquare, ShieldCheck, Sparkles, Plus, Lock } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const PLATFORMS = ["instagram","tiktok","youtube_shorts","facebook","x_twitter","linkedin","threads"];
const EVENT_TYPES = ["comment","dm","mention","story_reply","follow","share","creator_interest","keyword_trigger","link_click","profile_visit_signal","manual_import"];

type Business = { id: string; name: string };
type EngagementEvent = {
  id: string;
  platform_key: string;
  event_type: string;
  contact_handle: string | null;
  message_text: string | null;
  keyword_detected: string | null;
  detected_intent: string | null;
  sentiment: string | null;
  creator_signal: boolean;
  customer_signal: boolean;
  fan_signal: boolean;
  spam_signal: boolean;
  requires_response: boolean;
  received_at: string;
};
type Blueprint = {
  id: string;
  flow_key: string;
  flow_name: string;
  platform_key: string;
  trigger_keyword: string | null;
  public_reply: string | null;
  dm_opening: string | null;
  button_text: string | null;
  button_url: string | null;
  followup_question: string | null;
  qualification_tags: string[] | null;
  live_in_manychat: boolean;
};

export default function SocialEngagementInboxPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifyResult, setClassifyResult] = useState<any>(null);
  const [exportResult, setExportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [gateEnabled, setGateEnabled] = useState<boolean | null>(null);

  // manual import form
  const [newPlatform, setNewPlatform] = useState("instagram");
  const [newEventType, setNewEventType] = useState("comment");
  const [newHandle, setNewHandle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
    (supabase as any).from("external_action_gates").select("enabled").eq("gate_key", "manychat_dm_send_gate").maybeSingle()
      .then(({ data }: any) => setGateEnabled(data?.enabled ?? false));
  }, []);

  const reload = async (bid: string) => {
    const [{ data: ev }, { data: bp }] = await Promise.all([
      (supabase as any).from("social_engagement_events").select("*").eq("business_id", bid).order("received_at", { ascending: false }).limit(50),
      (supabase as any).from("manychat_flow_blueprints").select("*").eq("business_id", bid).order("created_at", { ascending: false }),
    ]);
    setEvents((ev ?? []) as EngagementEvent[]);
    setBlueprints((bp ?? []) as Blueprint[]);
  };

  useEffect(() => { reload(businessId); }, [businessId]);

  const importEvent = async () => {
    if (!newMessage.trim() && newEventType !== "follow") return;
    setSaving(true); setError(null);
    try {
      const { error } = await (supabase as any).from("social_engagement_events").insert({
        business_id: businessId,
        platform_key: newPlatform,
        event_type: newEventType,
        contact_handle: newHandle.trim() || null,
        message_text: newMessage.trim() || null,
      });
      if (error) throw error;
      setNewHandle(""); setNewMessage("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setSaving(false); }
  };

  const classifyEvent = async (id: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("social-engagement-classify", {
        body: { social_engagement_event_id: id, persist: true },
      });
      if (err) throw err;
      setClassifyResult(data);
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const exportBlueprints = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("manychat-flow-export", {
        body: { business_id: businessId },
      });
      if (err) throw err;
      setExportResult(data);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" /> Social Engagement Inbox + ManyChat Planner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture comments, DMs, keyword triggers and creator signals. Plan ManyChat flows. <Badge variant="outline" className="ml-1">No auto-DM · No ManyChat API</Badge>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Business</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Lock className="h-3.5 w-3.5" /> ManyChat DM gate
              <Badge variant={gateEnabled ? "default" : "outline"}>
                {gateEnabled === null ? "loading…" : gateEnabled ? "enabled" : "disabled"}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              Live DM sending via ManyChat API is disabled. Confirmation phrase to enable later: <code>SEND MANYCHAT DM</code>.
            </p>
          </div>
        </div>

        {/* Manual import */}
        <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2">
          <div className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Manually import an engagement event</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select className="rounded-md border border-border bg-background p-2 text-sm" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="rounded-md border border-border bg-background p-2 text-sm" value={newEventType} onChange={(e) => setNewEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input placeholder="@handle" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} />
            <Button size="sm" onClick={importEvent} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save event"}
            </Button>
          </div>
          <Textarea placeholder="Comment / DM text (e.g. 'CANDY')" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
        </div>

        {/* Events */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Engagement events</div>
            <Badge variant="secondary">{events.length}</Badge>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events captured yet. Import one above to test classification.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {events.map((e) => (
                <div key={e.id} className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.platform_key}</Badge>
                    <Badge variant="secondary">{e.event_type}</Badge>
                    {e.keyword_detected && <Badge>{e.keyword_detected}</Badge>}
                    {e.detected_intent && <Badge variant="outline">intent: {e.detected_intent}</Badge>}
                    {e.sentiment && <Badge variant="outline">{e.sentiment}</Badge>}
                    {e.creator_signal && <Badge>creator</Badge>}
                    {e.fan_signal && <Badge>fan</Badge>}
                    {e.customer_signal && <Badge>support</Badge>}
                    {e.spam_signal && <Badge variant="destructive">spam</Badge>}
                    {e.requires_response && <Badge variant="outline">needs reply</Badge>}
                    <Badge variant="outline" className="ml-auto">no auto-DM</Badge>
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{e.contact_handle ?? "anon"}</span>
                    {e.message_text ? <> — {e.message_text}</> : null}
                  </div>
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => classifyEvent(e.id)} disabled={loading}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Classify
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {classifyResult && (
          <div className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Classification</div>
            <div className="mt-1">Label: <Badge>{classifyResult.classification?.label}</Badge> · Sentiment: {classifyResult.classification?.sentiment} · Keyword: {classifyResult.classification?.keyword_detected ?? "—"}</div>
            <div className="mt-1">Recommended action: <span className="font-medium">{classifyResult.classification?.recommendation?.action}</span></div>
            {classifyResult.classification?.recommendation?.manychat_flow && (
              <div>ManyChat flow: <code>{classifyResult.classification.recommendation.manychat_flow}</code></div>
            )}
            {classifyResult.classification?.recommendation?.founder_reply && (
              <div className="mt-1 text-muted-foreground">Founder reply suggestion: {classifyResult.classification.recommendation.founder_reply}</div>
            )}
          </div>
        )}

        {/* Blueprints */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">ManyChat blueprints</div>
            <Button size="sm" variant="outline" onClick={exportBlueprints} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Export manual setup text"}
            </Button>
          </div>
          {blueprints.length === 0 ? (
            <p className="text-xs text-muted-foreground">No blueprints yet for this business.</p>
          ) : (
            <div className="space-y-2">
              {blueprints.map((b) => (
                <div key={b.id} className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{b.platform_key}</Badge>
                    <span className="font-medium text-foreground">{b.flow_name}</span>
                    {b.trigger_keyword && <Badge>keyword: {b.trigger_keyword}</Badge>}
                    <Badge variant={b.live_in_manychat ? "default" : "outline"}>{b.live_in_manychat ? "live (manual)" : "not live"}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                    <div><span className="font-medium text-foreground">Public reply:</span> {b.public_reply ?? "—"}</div>
                    <div><span className="font-medium text-foreground">DM opening:</span> {b.dm_opening ?? "—"}</div>
                    <div><span className="font-medium text-foreground">Button:</span> {b.button_text ?? "—"} → {b.button_url ?? "—"}</div>
                    <div><span className="font-medium text-foreground">Followup:</span> {b.followup_question ?? "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {exportResult?.exports?.length > 0 && (
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="text-xs font-medium mb-2">Exported manual setup text ({exportResult.count})</div>
            <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground max-h-72 overflow-auto">{exportResult.exports.map((e: any) => e.manual_setup_text).join("\n\n———\n\n")}</pre>
          </div>
        )}

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      </CardContent>
    </Card>
  );
}