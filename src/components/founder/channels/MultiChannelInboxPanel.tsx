import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, PlugZap, Send, AlertCircle, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MultiChannelInboxPanel() {
  const [channelKey, setChannelKey] = useState("manual_founder_note");
  const [contactEmail, setContactEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [busy, setBusy] = useState(false);
  const [intakeResult, setIntakeResult] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);

  const { data: channels } = useQuery({
    queryKey: ["communication_channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_channels")
        .select("*")
        .order("channel_label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["multi_channel_inbound_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multi_channel_inbound_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const unmatched = (events ?? []).filter((e: any) => !e.matched_contact_id);

  async function runIntake() {
    setBusy(true);
    setMatchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("multi-channel-intake", {
        body: {
          channel_key: channelKey,
          contact_email: contactEmail || null,
          subject: subject || null,
          message_text: messageText || null,
          source: "manual",
        },
      });
      if (error) throw error;
      setIntakeResult(data);
      await refetchEvents();
    } catch (e: any) {
      setIntakeResult({ error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  async function runMatch(eventId: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("multi-channel-match-preview", {
        body: { event_id: eventId },
      });
      if (error) throw error;
      setMatchResult(data);
    } catch (e: any) {
      setMatchResult({ error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" /> Multi-Channel Inbox Layer
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Unified inbound capture. Outbound disabled — replies require founder approval.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            {(channels ?? []).map((c: any) => (
              <div key={c.id} className="rounded border p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.channel_label}</span>
                  <Badge variant={c.live_connected ? "default" : "outline"}>
                    {c.live_connected ? "connected" : "not connected"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant={c.enabled ? "secondary" : "outline"}>
                    {c.enabled ? "enabled" : "disabled"}
                  </Badge>
                  <Badge variant="outline">{c.channel_type}</Badge>
                  {c.outbound_supported && (
                    <Badge variant="destructive" title="Outbound disabled until approved">
                      outbound off
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" /> Manual import / test event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Channel</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                value={channelKey}
                onChange={(e) => setChannelKey(e.target.value)}
              >
                {(channels ?? []).map((c: any) => (
                  <option key={c.channel_key} value={c.channel_key}>{c.channel_label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Contact email</Label>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="optional" />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Message text</Label>
            <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} />
          </div>
          <Button size="sm" onClick={runIntake} disabled={busy}>
            <Send className="h-4 w-4 mr-2" />
            {busy ? "Working…" : "Record inbound event"}
          </Button>
          {intakeResult && (
            <div className="rounded-md border bg-muted/30 p-2 text-xs">
              {intakeResult.error
                ? <span className="text-destructive">{intakeResult.error}</span>
                : <span>Event {intakeResult.event_id?.slice(0,8)} recorded · outbound disabled · no provider mutation.</span>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4 text-primary" /> Recent inbound ({events?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {(events ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No inbound events yet.</p>
            )}
            {(events ?? []).map((e: any) => (
              <div key={e.id} className="rounded border p-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{e.channel_key}</span>
                  <Badge variant="outline">{e.processed_status}</Badge>
                </div>
                <div className="text-muted-foreground">
                  {e.contact_email ?? e.contact_handle ?? "anonymous"} · {formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}
                </div>
                {e.subject && <div className="truncate">{e.subject}</div>}
                <Button size="sm" variant="outline" onClick={() => runMatch(e.id)} disabled={busy}>
                  <Bot className="h-3 w-3 mr-1" /> Preview match & agent
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> Unmatched ({unmatched.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {unmatched.length === 0 && <p className="text-xs text-muted-foreground">All matched.</p>}
            {unmatched.map((e: any) => (
              <div key={e.id} className="rounded border p-2 text-xs">
                {e.channel_key} · {e.contact_email ?? e.contact_handle ?? "anon"}
              </div>
            ))}
            {matchResult && (
              <div className="mt-3 rounded border bg-muted/30 p-2 text-xs space-y-1">
                {matchResult.error
                  ? <span className="text-destructive">{matchResult.error}</span>
                  : (
                    <>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">lang: {matchResult.detected_language}</Badge>
                        <Badge variant="secondary">agent: {matchResult.recommended_agent}</Badge>
                        <Badge variant="outline">intent: {matchResult.recommended_intent}</Badge>
                        <Badge variant="destructive">no reply sent</Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {matchResult.matched_contact
                          ? `Matched contact: ${matchResult.matched_contact.full_name ?? matchResult.matched_contact.email}`
                          : "No CRM contact matched."}
                      </div>
                      <div className="text-muted-foreground italic">{matchResult.notes}</div>
                    </>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}