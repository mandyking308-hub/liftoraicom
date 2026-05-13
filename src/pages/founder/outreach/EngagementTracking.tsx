import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  contact_id: string;
  name: string | null;
  email: string | null;
  business_name: string | null;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  last_engagement_at: string | null;
};

export default function EngagementTracking() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: queue } = await supabase
        .from("email_queue")
        .select("contact_id, business_name, status, sent_at")
        .not("contact_id", "is", null);
      const { data: tracking } = await supabase
        .from("email_tracking_events")
        .select("contact_id, event_type, event_at");
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, email");

      const map = new Map<string, Row>();
      const ensure = (cid: string, biz: string | null) => {
        if (!map.has(cid)) {
          const c = contacts?.find((x: any) => x.id === cid);
          map.set(cid, {
            contact_id: cid,
            name: c?.name ?? null,
            email: c?.email ?? null,
            business_name: biz,
            sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0,
            last_engagement_at: null,
          });
        }
        return map.get(cid)!;
      };
      (queue ?? []).forEach((q: any) => {
        if (!q.contact_id) return;
        const r = ensure(q.contact_id, q.business_name);
        if (q.status === "sent") r.sent += 1;
      });
      (tracking ?? []).forEach((t: any) => {
        if (!t.contact_id) return;
        const r = ensure(t.contact_id, null);
        if (t.event_type === "open") r.opened += 1;
        if (t.event_type === "click") r.clicked += 1;
        if (t.event_type === "reply") r.replied += 1;
        if (t.event_type === "bounce") r.bounced += 1;
        if (t.event_type === "unsubscribe") r.unsubscribed += 1;
        if (!r.last_engagement_at || new Date(t.event_at) > new Date(r.last_engagement_at)) {
          r.last_engagement_at = t.event_at;
        }
      });
      setRows(Array.from(map.values()).filter(r => r.sent + r.opened + r.clicked + r.replied + r.bounced + r.unsubscribed > 0));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Engagement Tracking</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Read-only engagement signals per contact. Opens are an <em>open signal</em> only and are not proof of human reading
          (image preloaders and corporate scanners trigger pixel loads). Clicks and replies are stronger evidence of human engagement.
        </p>
      </div>

      <Card className="tech-card border-amber-500/40">
        <CardHeader>
          <CardTitle className="text-amber-400">Compliance note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Open and click tracking <strong>must be disclosed</strong> in the email footer and privacy notice before any future
          send is rewritten to inject the tracking pixel or tracked links. Tracking endpoints exist but are not yet injected
          into outgoing emails.
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle>Per-contact engagement</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No engagement events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Business</th>
                    <th className="py-2 pr-3">Sent</th>
                    <th className="py-2 pr-3">Opens</th>
                    <th className="py-2 pr-3">Clicks</th>
                    <th className="py-2 pr-3">Replies</th>
                    <th className="py-2 pr-3">Bounces</th>
                    <th className="py-2 pr-3">Unsubs</th>
                    <th className="py-2 pr-3">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.contact_id} className="border-b border-border/40">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{r.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="py-2 pr-3">{r.business_name ?? "—"}</td>
                      <td className="py-2 pr-3">{r.sent}</td>
                      <td className="py-2 pr-3">
                        {r.opened > 0 ? <Badge variant="secondary">{r.opened}</Badge> : 0}
                      </td>
                      <td className="py-2 pr-3">
                        {r.clicked > 0 ? <Badge>{r.clicked}</Badge> : 0}
                      </td>
                      <td className="py-2 pr-3">{r.replied}</td>
                      <td className="py-2 pr-3">{r.bounced}</td>
                      <td className="py-2 pr-3">{r.unsubscribed}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {r.last_engagement_at ? new Date(r.last_engagement_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}