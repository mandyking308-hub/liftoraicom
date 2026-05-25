import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Coins, Activity, Compass, Plug, Lock } from "lucide-react";

const sb: any = supabase;
const useT = (table: string, order = "created_at", asc = false) =>
  useQuery<any[]>({
    queryKey: [`op_panel_${table}`],
    queryFn: async () => {
      const { data, error } = await sb.from(table).select("*").order(order, { ascending: asc }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

const Empty = ({ m }: { m: string }) => <div className="text-sm text-muted-foreground italic py-6 text-center">{m}</div>;

export default function PortfolioOperatingPanels() {
  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1500px]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-primary" /> Operating Panels</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Capital allocation, capacity, strategic assumptions, paid connector registry and integration allowlist. View-only register — no paid connectors are activated here, no secrets are stored.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Command Centre</Link></Button>
        </div>

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Read-only register</AlertTitle>
          <AlertDescription className="text-xs">
            Paid connectors and integrations show <em>not_configured / configured / active / paused / error</em>. Activation, billing and key handling happen in Connectors and the Approval Queue, never here.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="capital">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="capital"><Coins className="h-3 w-3 mr-1" /> Capital allocation</TabsTrigger>
            <TabsTrigger value="capacity"><Activity className="h-3 w-3 mr-1" /> Capacity</TabsTrigger>
            <TabsTrigger value="assumptions"><Compass className="h-3 w-3 mr-1" /> Strategic assumptions</TabsTrigger>
            <TabsTrigger value="paid"><Plug className="h-3 w-3 mr-1" /> Paid connectors</TabsTrigger>
            <TabsTrigger value="allowlist"><Plug className="h-3 w-3 mr-1" /> Integration allowlist</TabsTrigger>
          </TabsList>

          <TabsContent value="capital"><CapitalPanel /></TabsContent>
          <TabsContent value="capacity"><CapacityPanel /></TabsContent>
          <TabsContent value="assumptions"><AssumptionsPanel /></TabsContent>
          <TabsContent value="paid"><PaidConnectorsPanel /></TabsContent>
          <TabsContent value="allowlist"><AllowlistPanel /></TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function CapitalPanel() {
  const { data: rows = [], isLoading } = useT("ma_capital_allocation", "updated_at");
  const { data: assets = [] } = useT("ma_portfolio_assets", "asset_name", true);
  const byId = Object.fromEntries(assets.map((a: any) => [a.id, a.asset_name]));
  return (
    <Card className="tech-card mt-4">
      <CardHeader><CardTitle>Capital Allocation</CardTitle><CardDescription>Per-asset monthly budgets, oversight, advisers, outreach and data APIs.</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <Empty m="Loading…" /> : rows.length === 0 ? <Empty m="No capital allocation records yet." /> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Asset</TableHead><TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Oversight</TableHead><TableHead className="text-right">Adviser</TableHead>
              <TableHead className="text-right">Outreach</TableHead><TableHead className="text-right">Data APIs</TableHead>
              <TableHead className="text-right">Priority</TableHead><TableHead>Recommendation</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Link to={`/founder/portfolio-exit/${r.portfolio_asset_id}`} className="hover:text-primary">{byId[r.portfolio_asset_id] ?? r.portfolio_asset_id?.slice(0, 8)}</Link></TableCell>
                  <TableCell className="text-right tabular-nums">{r.currency} {Number(r.monthly_budget ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.human_oversight_budget ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.adviser_budget ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.outreach_budget ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.data_api_budget ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.priority_score ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[260px]">{r.resource_recommendation ?? r.rationale ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
}

function CapacityPanel() {
  const { data: rows = [], isLoading } = useT("ma_capacity_snapshots", "snapshot_date");
  return (
    <Card className="tech-card mt-4">
      <CardHeader><CardTitle>Capacity Snapshots</CardTitle><CardDescription>Founder/operator capacity vs. open work and approvals.</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <Empty m="Loading…" /> : rows.length === 0 ? <Empty m="No capacity snapshots recorded. Capacity check runs as part of weekly review." /> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Verdict</TableHead>
              <TableHead className="text-right">Approvals</TableHead><TableHead className="text-right">Overdue exec</TableHead>
              <TableHead className="text-right">DR gaps</TableHead><TableHead className="text-right">Oversight h/wk</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.snapshot_date}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.capacity_score ?? "—"}</TableCell>
                  <TableCell><Badge variant={r.capacity_verdict === "critical" || r.capacity_verdict === "overloaded" ? "destructive" : "outline"} className="text-[10px]">{r.capacity_verdict ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{r.pending_approvals ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.overdue_execution_targets ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.data_room_gaps ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.oversight_hours_per_week ?? 0}</TableCell>
                  <TableCell className="text-xs max-w-[260px]">{r.recommendation ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
}

function AssumptionsPanel() {
  const { data: rows = [], isLoading } = useT("ma_strategic_assumptions", "updated_at");
  return (
    <Card className="tech-card mt-4">
      <CardHeader><CardTitle>Strategic Assumptions</CardTitle><CardDescription>What we are betting on. Each assumption has an owner, test method and review date.</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <Empty m="Loading…" /> : rows.length === 0 ? <Empty m="No strategic assumptions logged yet." /> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Assumption</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Confidence</TableHead>
              <TableHead>Owner</TableHead><TableHead>Test method</TableHead><TableHead>Review</TableHead><TableHead>Outcome</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="text-xs max-w-[300px]">{r.assumption}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{r.confidence != null ? Math.round(Number(r.confidence) * 100) : "—"}</TableCell>
                  <TableCell className="text-xs">{r.owner ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[220px]">{r.test_method ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.review_date ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[220px]">{r.outcome ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    not_configured: "outline", configured: "secondary", active: "default",
    paused: "outline", error: "destructive", blocked: "destructive",
    pending: "outline", approved: "secondary",
  };
  return <Badge variant={(map[s] as any) ?? "outline"} className="text-[10px]">{s}</Badge>;
}

function PaidConnectorsPanel() {
  const { data: rows = [], isLoading } = useT("ma_paid_connectors", "connector_name", true);
  return (
    <Card className="tech-card mt-4">
      <CardHeader><CardTitle>Paid Connector Registry</CardTitle><CardDescription>Status only. No keys, no activation here. Secret-reference names only.</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <Empty m="Loading…" /> : rows.length === 0 ? <Empty m="No paid connectors registered. Add via founder approval before any activation." /> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Connector</TableHead><TableHead>Status</TableHead><TableHead>Licence</TableHead>
              <TableHead>Secret reference</TableHead><TableHead>Allowed use</TableHead>
              <TableHead>Last run</TableHead><TableHead>Last error</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.connector_name}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.licence_status ?? "unknown"}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{r.secret_reference_name ?? <span className="text-muted-foreground italic">none</span>}</TableCell>
                  <TableCell className="text-xs max-w-[260px]">{r.allowed_use_notes ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.last_run_at ? new Date(r.last_run_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] text-destructive">{r.last_error ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
}

function AllowlistPanel() {
  const { data: rows = [], isLoading } = useT("ma_integration_allowlist", "integration_name", true);
  return (
    <Card className="tech-card mt-4">
      <CardHeader><CardTitle>Integration Allowlist</CardTitle><CardDescription>Which external integrations are blocked, pending or approved. Secret references only.</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <Empty m="Loading…" /> : rows.length === 0 ? <Empty m="No integrations registered." /> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Integration</TableHead><TableHead>Status</TableHead><TableHead>Risk</TableHead>
              <TableHead>Data accessed</TableHead><TableHead>Secret reference</TableHead>
              <TableHead>Approval owner</TableHead><TableHead>Last reviewed</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.integration_name}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell><Badge variant={r.risk_rating === "high" ? "destructive" : "outline"} className="text-[10px]">{r.risk_rating ?? "unknown"}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[220px]">{r.data_accessed ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{r.secret_reference ?? <span className="text-muted-foreground italic">none</span>}</TableCell>
                  <TableCell className="text-xs">{r.approval_owner ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.last_reviewed_at ? new Date(r.last_reviewed_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
}