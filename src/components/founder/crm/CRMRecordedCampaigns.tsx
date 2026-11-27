import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRecordedPages, recordedCampaignName } from "@/lib/crmRecordedHistory";

type Lead = { business_id: string; provider_campaign_id: string; provider_lead_id: string; lead_status: string | null; sent_count: number | null; reply_count: number | null; current_step: number | null; sending_mailbox: string | null; last_sent_at: string | null; reconciled_at: string | null; removed_from_provider_at: string | null };
type Activity = { id: string; interaction_type: string; direction: string | null; subject: string | null; summary: string | null; occurred_at: string; provider_campaign_id: string | null };
type Campaign = { business_id: string; provider_campaign_id: string; campaign_name: string | null };
const date = (value: string | null) => value ? new Date(value).toLocaleString("en-GB") : "Not recorded";

export default function CRMRecordedCampaigns({ contactId }: { contactId: string }) {
  const [data, setData] = useState<{ leads: Lead[]; campaigns: Campaign[]; businesses: { id: string; name: string }[]; activities: Activity[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    void (async () => {
      try {
        const [leads, activities] = await Promise.all([
          readRecordedPages<Lead>((from, to) => supabase.from("smartlead_lead_snapshots").select("business_id, provider_campaign_id, provider_lead_id, lead_status, sent_count, reply_count, current_step, sending_mailbox, last_sent_at, reconciled_at, removed_from_provider_at").eq("liftor_contact_id", contactId).order("business_id").order("provider_campaign_id").order("provider_lead_id").range(from, to)),
          readRecordedPages<Activity>((from, to) => supabase.from("crm_interaction_ledger").select("id, interaction_type, direction, subject, summary, occurred_at, provider_campaign_id").eq("contact_id", contactId).order("occurred_at", { ascending: false }).order("id").range(from, to)),
        ]);
        const ids = [...new Set(leads.map((l) => l.business_id))];
        const [campaigns, businesses] = ids.length ? await Promise.all([
          supabase.from("smartlead_campaign_snapshots").select("business_id, provider_campaign_id, campaign_name").in("business_id", ids),
          supabase.from("businesses").select("id, name").in("id", ids),
        ]) : [{ data: [], error: null }, { data: [], error: null }];
        if (campaigns.error || businesses.error) throw new Error("Could not load campaign or business details");
        if (!cancelled) setData({ leads, activities, campaigns: campaigns.data ?? [], businesses: businesses.data ?? [] });
      } catch { if (!cancelled) setError("Could not load recorded campaigns and activity. Reload to try again."); }
    })();
    return () => { cancelled = true; };
  }, [contactId]);
  return (
    <section className="space-y-4" aria-label="Recorded campaigns and activity">
      <h2 className="text-lg font-semibold">Campaigns</h2>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !data ? <p className="text-sm text-muted-foreground">Loading recorded activity…</p> : <>
        {!data.leads.length && <p className="text-sm text-muted-foreground">No campaign membership recorded.</p>}
        <div className="grid gap-3 md:grid-cols-2">{data.leads.map((l) => <Card key={`${l.business_id}:${l.provider_campaign_id}:${l.provider_lead_id}`}>
          <CardHeader><CardTitle className="text-base">{recordedCampaignName(l, data.campaigns)}</CardTitle><p className="text-sm text-muted-foreground">{data.businesses.find((b) => b.id === l.business_id)?.name ?? "Business name not recorded"}</p></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {l.removed_from_provider_at && <Badge variant="outline">Historical membership</Badge>}
            <dl className="grid grid-cols-2 gap-2 break-words">
              <dt className="text-muted-foreground">Recorded status</dt><dd>{l.lead_status ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Emails sent</dt><dd>{l.sent_count ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Replies</dt><dd>{l.reply_count ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Sequence step</dt><dd>{l.current_step ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Sending mailbox</dt><dd className="break-all">{l.sending_mailbox ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Last sent</dt><dd>{date(l.last_sent_at)}</dd>
              <dt className="text-muted-foreground">Last checked</dt><dd>{date(l.reconciled_at)}</dd>
            </dl>
          </CardContent>
        </Card>)}</div>
        <h2 className="text-lg font-semibold">Recorded journey</h2>
        {!data.activities.length ? <p className="text-sm text-muted-foreground">No journey activity recorded.</p> : <ol className="divide-y divide-border">{data.activities.map((a) => <li key={a.id} className="space-y-1 py-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{a.interaction_type.replace(/_/g, " ")}</span><time className="text-xs text-muted-foreground">{date(a.occurred_at)}</time></div>
          {a.direction && <div className="text-xs text-muted-foreground">{a.direction}{a.provider_campaign_id ? ` · Campaign ${a.provider_campaign_id}` : ""}</div>}
          {a.subject && <p className="break-words">{a.subject}</p>}{a.summary && <p className="whitespace-pre-wrap break-words text-muted-foreground">{a.summary}</p>}
        </li>)}</ol>}
      </>}
    </section>
  );
}