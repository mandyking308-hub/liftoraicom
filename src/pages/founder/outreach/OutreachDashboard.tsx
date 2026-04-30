import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Reply, AlertTriangle, Activity, Users, Inbox, Upload, Megaphone, Database } from "lucide-react";
import SimulatedSendingBanner from "@/components/outreach/SimulatedSendingBanner";

const OutreachDashboard = () => {
  const [stats, setStats] = useState({
    sent7d: 0, replyRate: 0, bounceRate: 0, activeCampaigns: 0,
  });
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [inboxUsage, setInboxUsage] = useState<Array<{ email: string; used: number; limit: number; business: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [
      { count: sent7d },
      { data: events },
      { count: activeCampaigns },
      { data: contacts },
      { data: inboxes },
    ] = await Promise.all([
      supabase.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", sevenDaysAgo),
      supabase.from("email_events").select("event_type").gte("timestamp", sevenDaysAgo),
      supabase.from("outreach_campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("contacts").select("status"),
      supabase.from("inboxes").select("email_address, business_name, current_send_count, daily_send_limit, active").eq("active", true),
    ]);

    const sent = events?.filter((e) => e.event_type === "sent").length ?? 0;
    const replies = events?.filter((e) => e.event_type === "replied").length ?? 0;
    const bounces = events?.filter((e) => e.event_type === "bounced").length ?? 0;
    setStats({
      sent7d: sent7d ?? 0,
      replyRate: sent > 0 ? Math.round((replies / sent) * 1000) / 10 : 0,
      bounceRate: sent > 0 ? Math.round((bounces / sent) * 1000) / 10 : 0,
      activeCampaigns: activeCampaigns ?? 0,
    });

    const counts: Record<string, number> = {};
    (contacts ?? []).forEach((c) => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
    setByStatus(counts);

    setInboxUsage((inboxes ?? []).map((i) => ({
      email: i.email_address, business: i.business_name, used: i.current_send_count, limit: i.daily_send_limit,
    })));
    setLoading(false);
  }

  const panels = [
    { label: "Emails Sent (7d)", value: stats.sent7d.toLocaleString(), icon: Mail },
    { label: "Reply Rate", value: `${stats.replyRate}%`, icon: Reply },
    { label: "Bounce Rate", value: `${stats.bounceRate}%`, icon: AlertTriangle },
    { label: "Active Campaigns", value: stats.activeCampaigns.toString(), icon: Activity },
  ];

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Outreach Engine</h1>
            <p className="text-sm text-muted-foreground">Dataset-driven outbound, governed by the CRM sanity layer.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm"><Link to="/founder/outreach/imports"><Upload className="h-4 w-4 mr-2" />Imports</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/outreach/campaigns"><Megaphone className="h-4 w-4 mr-2" />Campaigns</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/outreach/queue"><Database className="h-4 w-4 mr-2" />Queue</Link></Button>
          </div>
        </div>

        <SimulatedSendingBanner />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {panels.map((p) => (
            <Card key={p.label}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-medium">{p.label}</CardTitle>
                <p.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold tabular-nums">{loading ? "—" : p.value}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Leads by Status</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(byStatus).length === 0 ? <p className="text-sm text-muted-foreground">No contacts yet.</p> : (
                <div className="space-y-2">
                  {Object.entries(byStatus).sort(([, a], [, b]) => b - a).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{k}</Badge>
                      <span className="tabular-nums font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Inbox className="h-4 w-4" />Inbox Usage (today)</CardTitle></CardHeader>
            <CardContent>
              {inboxUsage.length === 0 ? <p className="text-sm text-muted-foreground">No active inboxes.</p> : (
                <div className="space-y-3">
                  {inboxUsage.map((i) => {
                    const pct = i.limit > 0 ? Math.min(100, Math.round((i.used / i.limit) * 100)) : 0;
                    return (
                      <div key={i.email} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono truncate">{i.email}</span>
                          <span className="tabular-nums text-muted-foreground">{i.used} / {i.limit}</span>
                        </div>
                        <div className="h-1.5 rounded bg-secondary overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{i.business || "Unassigned"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FounderLayout>
  );
};

export default OutreachDashboard;
