import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, ShieldAlert, Search } from "lucide-react";
import { buildCrmDedupeKey } from "@/lib/crm/crmDedupeKey";

type LedgerRow = {
  id: string;
  occurred_at: string;
  source_system: string;
  source_channel: string;
  interaction_type: string;
  contact_email: string | null;
  subject: string | null;
  matched_status: string | null;
  provider_type?: string | null;
  provider_message_id?: string | null;
  provider_campaign_id?: string | null;
  external_event_id?: string | null;
};

type ProviderEvent = {
  id: string;
  provider_type: string | null;
  provider_campaign_id: string | null;
  provider_message_id: string | null;
  external_event_id: string | null;
  contact_email: string | null;
  event_type: string | null;
  occurred_at: string | null;
};

type MatchResult = {
  candidates: any[];
  recommended: any | null;
  confidence: number;
  warnings: string[];
  dedupe_key: string | null;
  should_create_conversation_later: boolean;
  founder_review_required: boolean;
  inputs: any;
};

export default function CRMInteractionMatchPreviewPanel() {
  const [interactions, setInteractions] = useState<LedgerRow[]>([]);
  const [events, setEvents] = useState<ProviderEvent[]>([]);
  const [results, setResults] = useState<Record<string, MatchResult>>({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: ledger }, { data: ev }] = await Promise.all([
      supabase
        .from("crm_interaction_ledger" as any)
        .select("id, occurred_at, source_system, source_channel, interaction_type, contact_email, subject, matched_status, provider_type, provider_message_id, provider_campaign_id, external_event_id")
        .or("matched_status.is.null,matched_status.eq.unmatched")
        .order("occurred_at", { ascending: false })
        .limit(15),
      supabase
        .from("outbound_provider_events" as any)
        .select("id, provider_type, provider_campaign_id, provider_message_id, external_event_id, contact_email, event_type, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(10),
    ]);
    setInteractions((ledger as any[]) ?? []);
    setEvents((ev as any[]) ?? []);
    setLoading(false);
  };

  const runMatch = async (key: string, payload: Record<string, any>) => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("crm-interaction-match-preview", {
      body: payload,
    });
    if (!error && (data as any)?.result) {
      setResults((prev) => ({ ...prev, [key]: (data as any).result }));
    }
    setRunning(false);
  };

  const runAll = async () => {
    for (const i of interactions.slice(0, 5)) {
      await runMatch(`i:${i.id}`, { interaction_id: i.id });
    }
    for (const e of events.slice(0, 5)) {
      await runMatch(`e:${e.id}`, { provider_event_id: e.id });
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Interaction Match Preview</h3>
          <Badge variant="outline" className="text-[10px]">preview · apply disabled</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button size="sm" onClick={runAll} disabled={running || (!interactions.length && !events.length)}>
            <Search className="h-3 w-3 mr-1" /> Run match preview
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Resolves interactions and provider events to contact / business / BCR / conversation / campaign.
        Read-only — no writes to existing CRM, no emails, no Apollo, no Smartlead POSTs.
      </p>

      <div className="grid lg:grid-cols-2 gap-3">
        <Section title={`Unmatched interactions (${interactions.length})`}>
          {interactions.length === 0 && <Empty />}
          {interactions.map((i) => {
            const r = results[`i:${i.id}`];
            const dedupePreview = buildCrmDedupeKey({
              provider_type: i.provider_type,
              external_event_id: i.external_event_id,
              provider_message_id: i.provider_message_id,
              interaction_type: i.interaction_type,
              contact_email: i.contact_email,
              source_system: i.source_system,
              source_channel: i.source_channel,
              subject: i.subject,
              occurred_at: i.occurred_at,
            });
            return (
              <Row
                key={i.id}
                title={i.subject || i.interaction_type}
                meta={`${i.source_system}/${i.source_channel} · ${i.contact_email ?? "no-email"}`}
                dedupe={r?.dedupe_key || dedupePreview}
                result={r}
                onRun={() => runMatch(`i:${i.id}`, { interaction_id: i.id })}
                running={running}
              />
            );
          })}
        </Section>

        <Section title={`Recent provider events (${events.length})`}>
          {events.length === 0 && <Empty />}
          {events.map((e) => {
            const r = results[`e:${e.id}`];
            const dedupePreview = buildCrmDedupeKey({
              provider_type: e.provider_type,
              external_event_id: e.external_event_id,
              provider_message_id: e.provider_message_id,
              interaction_type: e.event_type,
              contact_email: e.contact_email,
              source_system: e.provider_type,
              source_channel: "provider_webhook",
              occurred_at: e.occurred_at,
            });
            return (
              <Row
                key={e.id}
                title={e.event_type || "event"}
                meta={`${e.provider_type ?? "?"} · camp:${e.provider_campaign_id ?? "—"} · ${e.contact_email ?? "no-email"}`}
                dedupe={r?.dedupe_key || dedupePreview}
                result={r}
                onRun={() => runMatch(`e:${e.id}`, { provider_event_id: e.id })}
                running={running}
              />
            );
          })}
        </Section>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <div className="text-[11px] text-muted-foreground italic">Nothing to match.</div>;
}

function Row({
  title, meta, dedupe, result, onRun, running,
}: {
  title: string; meta: string; dedupe: string;
  result?: MatchResult; onRun: () => void; running: boolean;
}) {
  const rec = result?.recommended;
  return (
    <div className="rounded-md border border-border/60 p-2 space-y-1 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium truncate">{title}</div>
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onRun} disabled={running}>
          match
        </Button>
      </div>
      <div className="text-muted-foreground truncate">{meta}</div>
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="text-[10px]">dedupe: {dedupe}</Badge>
        {result && (
          <>
            <Badge variant={rec ? "default" : "secondary"} className="text-[10px]">
              {rec ? `${rec.method} · ${(Number(rec.confidence) * 100).toFixed(0)}%` : "no match"}
            </Badge>
            {result.founder_review_required && (
              <Badge variant="destructive" className="text-[10px]">
                <ShieldAlert className="h-3 w-3 mr-1" /> founder review
              </Badge>
            )}
            {result.should_create_conversation_later && (
              <Badge variant="outline" className="text-[10px]">conversation later</Badge>
            )}
            {(result.warnings ?? []).map((w, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px]">{w}</Badge>
            ))}
            <Badge variant="outline" className="text-[10px]">apply disabled</Badge>
          </>
        )}
      </div>
      {rec && (
        <div className="text-[10px] text-muted-foreground">
          contact: {rec.contact_id ?? "—"} · business: {rec.business_id ?? "—"} · bcr: {rec.business_contact_relationship_id ?? "—"} · conv: {rec.conversation_id ?? "—"} · campaign: {rec.campaign_id ?? "—"}
        </div>
      )}
    </div>
  );
}