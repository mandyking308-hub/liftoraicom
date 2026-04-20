import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, AlertTriangle, Globe, Activity, TrendingUp, TrendingDown, Minus, Building2 } from "lucide-react";
import { format } from "date-fns";

type EventRow = {
  id: string; severity: "low" | "medium" | "high" | "critical";
  flag_type: string; message: string; entity_type: string; entity_id: string | null;
  business_name: string; jurisdiction: string; created_at: string; resolved: boolean;
};
type ScoreRow = {
  entity_type: string; entity_id: string; score: number; event_count: number;
  last_event_at: string | null; risk_trend: "up" | "stable" | "down"; high_risk: boolean;
};
type BusinessRisk = {
  business_name: string; score: number; previous_score: number;
  risk_trend: "up" | "stable" | "down"; high_risk: boolean; event_count: number;
};
type Jurisdiction = { country: string; gdpr_applicable: boolean; consent_required: boolean; region: string };

const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline", medium: "secondary", high: "default", critical: "destructive",
};

const TrendIcon = ({ trend }: { trend: "up" | "stable" | "down" }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-primary" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const ComplianceDashboard = () => {
  const { data: events = [] } = useQuery({
    queryKey: ["compliance_events_recent"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("compliance_events" as never)
        .select("id, severity, flag_type, message, entity_type, entity_id, business_name, jurisdiction, created_at, resolved")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as EventRow[]) ?? [];
    },
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["compliance_scores_top"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_scores" as never)
        .select("entity_type, entity_id, score, event_count, last_event_at")
        .order("score", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data as unknown as ScoreRow[]) ?? [];
    },
  });

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdiction_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_profiles" as never)
        .select("country, gdpr_applicable, consent_required, region")
        .order("country");
      if (error) throw error;
      return (data as unknown as Jurisdiction[]) ?? [];
    },
  });

  const sevCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.severity] = (acc[e.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Engine</h1>
            <p className="text-muted-foreground mt-1">
              Visibility-first compliance — flags, never blocks. Phase 1.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/founder/compliance/events" className="text-sm text-primary hover:underline">All events →</Link>
            <Link to="/founder/compliance/rules" className="text-sm text-primary hover:underline">Rules →</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="Events (7d)" value={events.length} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-destructive" />} label="Critical" value={sevCounts.critical ?? 0} />
          <StatCard icon={<Activity className="h-5 w-5" />} label="High risk entities" value={scores.filter((s) => s.score >= 50).length} />
          <StatCard icon={<Globe className="h-5 w-5" />} label="Jurisdictions" value={jurisdictions.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Events by severity (7d)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(["critical", "high", "medium", "low"] as const).map((s) => (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <Badge variant={SEV_VARIANT[s]}>{s}</Badge>
                    <span className="font-mono text-muted-foreground">{sevCounts[s] ?? 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Jurisdiction coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jurisdictions.map((j) => (
                  <div key={j.country} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{j.country}</span>
                      <span className="text-muted-foreground"> · {j.region || "—"}</span>
                    </div>
                    <div className="flex gap-1">
                      {j.gdpr_applicable && <Badge variant="outline" className="text-xs">GDPR</Badge>}
                      {j.consent_required && <Badge variant="outline" className="text-xs">consent</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>High-risk entities</CardTitle></CardHeader>
          <CardContent>
            {scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk scores yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Last event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((s) => (
                    <TableRow key={`${s.entity_type}-${s.entity_id}`}>
                      <TableCell><Badge variant="outline">{s.entity_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{s.entity_id?.slice(0, 8)}…</TableCell>
                      <TableCell>
                        <Badge variant={s.score >= 70 ? "destructive" : s.score >= 40 ? "default" : "outline"}>
                          {s.score}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.event_count}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {s.last_event_at ? format(new Date(s.last_event_at), "dd MMM HH:mm") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent compliance alerts</CardTitle></CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No compliance events in the last 7 days.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {events.slice(0, 12).map((e) => (
                  <li key={e.id} className="py-2 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={SEV_VARIANT[e.severity]} className="text-xs">{e.severity}</Badge>
                        <span className="text-sm font-medium">{e.flag_type}</span>
                        <Badge variant="outline" className="text-xs">{e.entity_type}</Badge>
                        {e.jurisdiction && <Badge variant="outline" className="text-xs">{e.jurisdiction}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{e.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.created_at), "dd MMM HH:mm")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card>
    <CardContent className="pt-6 flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default ComplianceDashboard;
