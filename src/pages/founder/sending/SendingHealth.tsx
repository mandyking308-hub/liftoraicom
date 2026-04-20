import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Mail, Globe, AlertTriangle, Flame, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type InboxHealth = {
  id: string;
  email_address: string;
  business_name: string;
  active: boolean;
  reputation_score: number;
  daily_send_limit: number;
  hourly_send_limit: number;
  current_send_count: number;
  hourly_send_count: number;
  last_sent_at: string | null;
  effective_daily_cap: number;
  warmup_days: number;
  health_status: "healthy" | "warming" | "throttled" | "paused";
};

type DomainUsage = {
  id: string;
  domain_name: string;
  daily_limit: number;
  current_usage: number;
  reputation_score: number;
  warmup_stage: "new" | "warming" | "stable";
  usage_pct: number;
};

type BlockedSend = {
  id: string;
  contact_email: string | null;
  business_name: string;
  status: string;
  block_reason: string;
  scheduled_at: string;
  created_at: string;
};

type WarmupRow = {
  inbox_id: string;
  email_address: string;
  business_name: string;
  warmup_started_at: string;
  days_in_warmup: number;
  current_cap: number;
  target_cap: number;
  progress_pct: number;
};

const healthBadge = (s: InboxHealth["health_status"]) => {
  const cls = {
    healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warming: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    throttled: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    paused: "bg-destructive/15 text-destructive border-destructive/30",
  }[s];
  return <Badge variant="outline" className={cls}>{s}</Badge>;
};

const SendingHealth = () => {
  const { data: inboxes = [] } = useQuery({
    queryKey: ["inbox_health_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_health_summary" as never)
        .select("*")
        .order("reputation_score", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as InboxHealth[];
    },
    refetchInterval: 30000,
  });

  const { data: domains = [] } = useQuery({
    queryKey: ["domain_usage_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domain_usage_summary" as never)
        .select("*")
        .order("usage_pct", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DomainUsage[];
    },
    refetchInterval: 30000,
  });

  const { data: blocked = [] } = useQuery({
    queryKey: ["blocked_sends_24h"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_sends_24h" as never)
        .select("*")
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as BlockedSend[];
    },
    refetchInterval: 30000,
  });

  const { data: warmup = [] } = useQuery({
    queryKey: ["warmup_progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_progress" as never)
        .select("*")
        .order("progress_pct", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WarmupRow[];
    },
    refetchInterval: 30000,
  });

  const { data: sent24h = 0 } = useQuery({
    queryKey: ["emails_sent_24h"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("email_queue" as never)
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", since);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const totalCap = inboxes.reduce((acc, i) => acc + (i.effective_daily_cap || 0), 0);
  const totalUsed = inboxes.reduce((acc, i) => acc + (i.current_send_count || 0), 0);
  const pausedInboxes = inboxes.filter((i) => i.health_status === "paused").length;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sending Health</h1>
          <p className="text-muted-foreground mt-1">
            Global timing, reputation protection, and warmup engine.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="tech-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Emails Sent (24h)</CardTitle>
              <Mail className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sent24h}</div>
              <p className="text-xs text-muted-foreground mt-1">across all inboxes</p>
            </CardContent>
          </Card>
          <Card className="tech-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Daily Capacity Used</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsed} / {totalCap}</div>
              <Progress value={totalCap ? (totalUsed / totalCap) * 100 : 0} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card className="tech-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Blocked / Delayed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{blocked.length}</div>
              <p className="text-xs text-muted-foreground mt-1">last 24h</p>
            </CardContent>
          </Card>
          <Card className="tech-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Paused Inboxes</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pausedInboxes}</div>
              <p className="text-xs text-muted-foreground mt-1">reputation &lt; 20</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inboxes">
          <TabsList>
            <TabsTrigger value="inboxes">Inbox Health</TabsTrigger>
            <TabsTrigger value="domains">Domain Usage</TabsTrigger>
            <TabsTrigger value="warmup">Warmup Progress</TabsTrigger>
            <TabsTrigger value="blocked">Blocked / Delayed</TabsTrigger>
          </TabsList>

          <TabsContent value="inboxes">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" />Inbox Health</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inbox</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Reputation</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                      <TableHead className="text-right">Hour</TableHead>
                      <TableHead>Last Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inboxes.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.email_address}</TableCell>
                        <TableCell className="text-muted-foreground">{i.business_name || "—"}</TableCell>
                        <TableCell>{healthBadge(i.health_status)}</TableCell>
                        <TableCell className="text-right">
                          <span className={i.reputation_score < 40 ? "text-destructive font-semibold" : ""}>
                            {i.reputation_score}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{i.current_send_count} / {i.effective_daily_cap}</TableCell>
                        <TableCell className="text-right">{i.hourly_send_count} / {i.hourly_send_limit}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {i.last_sent_at ? formatDistanceToNow(new Date(i.last_sent_at), { addSuffix: true }) : "never"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {inboxes.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No inboxes configured.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" />Domain Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Reputation</TableHead>
                      <TableHead>Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.domain_name}</TableCell>
                        <TableCell><Badge variant="outline">{d.warmup_stage}</Badge></TableCell>
                        <TableCell className="text-right">{d.reputation_score}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={d.usage_pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-24 text-right">
                              {d.current_usage} / {d.daily_limit}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {domains.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No domains tracked yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warmup">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Flame className="h-4 w-4" />Warmup Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inbox</TableHead>
                      <TableHead className="text-right">Day</TableHead>
                      <TableHead className="text-right">Cap</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warmup.map((w) => (
                      <TableRow key={w.inbox_id}>
                        <TableCell className="font-medium">{w.email_address}</TableCell>
                        <TableCell className="text-right">{w.days_in_warmup}</TableCell>
                        <TableCell className="text-right">{w.current_cap} / {w.target_cap}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={w.progress_pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-12 text-right">{w.progress_pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {warmup.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No inboxes in warmup.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blocked">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Blocked / Delayed Sends (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Retry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocked.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.contact_email ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{b.business_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{b.block_reason || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.scheduled_at ? formatDistanceToNow(new Date(b.scheduled_at), { addSuffix: true }) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {blocked.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No blocked or delayed sends in the last 24 hours.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
};

export default SendingHealth;