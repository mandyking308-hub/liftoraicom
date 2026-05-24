import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Siren, Eye, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Alert = {
  id: string;
  created_at: string;
  alert_type: string | null;
  severity: string | null;
  status: string | null;
  message: string;
  recommended_action: string | null;
  business_id: string | null;
  agent_id: string | null;
  campaign_id: string | null;
  task_id: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  audit_metadata: Record<string, unknown> | null;
};

const SEV_COLOR: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border",
  low: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  acknowledged: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function AICostAlerts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Alert | null>(null);

  const alertsQ = useQuery({
    queryKey: ["ai-cost-alerts", severity, status],
    queryFn: async () => {
      let q = supabase.from("ai_cost_alerts").select("*").order("created_at", { ascending: false }).limit(500);
      if (status !== "all") q = q.eq("status", status);
      if (severity !== "all") q = q.eq("severity", severity);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  const ledgerQ = useQuery({
    queryKey: ["alert-linked-ledger", selected?.business_id, selected?.agent_id, selected?.task_id],
    enabled: !!selected,
    queryFn: async () => {
      if (!selected) return [];
      const since = new Date(new Date(selected.created_at).getTime() - 60 * 60 * 1000).toISOString();
      let q = supabase.from("ai_usage_ledger")
        .select("id,created_at,model_tier,estimated_cost,status,task_category")
        .gte("created_at", since)
        .lte("created_at", selected.created_at)
        .order("created_at", { ascending: false })
        .limit(20);
      if (selected.task_id) q = q.eq("task_id", selected.task_id);
      else if (selected.agent_id) q = q.eq("agent_id", selected.agent_id);
      else if (selected.business_id) q = q.eq("business_id", selected.business_id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "acknowledged" | "resolved" }) => {
      const patch: any = { status: newStatus };
      if (newStatus === "acknowledged") patch.acknowledged_at = new Date().toISOString();
      if (newStatus === "resolved") patch.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("ai_cost_alerts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Alert updated" });
      qc.invalidateQueries({ queryKey: ["ai-cost-alerts"] });
    },
  });

  const rows = useMemo(
    () =>
      (alertsQ.data ?? []).filter((a) =>
        search ? (a.message + " " + (a.alert_type ?? "")).toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [alertsQ.data, search],
  );

  return (
    <FounderLayout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Siren className="h-6 w-6 text-primary" /> AI Cost Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Stop-loss, budget and quality alerts. Acknowledge to flag review; resolve once handled.
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
            <CardTitle>{rows.length} alerts</CardTitle>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Search…" className="max-w-xs"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recommended</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{format(new Date(a.created_at), "dd MMM HH:mm")}</TableCell>
                      <TableCell>
                        <Badge className={SEV_COLOR[a.severity ?? "info"] ?? ""}>{a.severity ?? "info"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{a.alert_type ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-md truncate">{a.message}</TableCell>
                      <TableCell className="text-xs">{a.recommended_action ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLOR[a.status ?? "open"] ?? ""}>{a.status ?? "open"}</Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(a)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {a.status !== "acknowledged" && a.status !== "resolved" && (
                          <Button size="sm" variant="ghost"
                            onClick={() => updateStatus.mutate({ id: a.id, newStatus: "acknowledged" })}>
                            Ack
                          </Button>
                        )}
                        {a.status !== "resolved" && (
                          <Button size="sm" variant="ghost"
                            onClick={() => updateStatus.mutate({ id: a.id, newStatus: "resolved" })}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No alerts. AI is running within limits.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Alert detail
              </SheetTitle>
              <SheetDescription>{selected?.alert_type}</SheetDescription>
            </SheetHeader>
            {selected && (
              <div className="space-y-4 mt-4 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge className={SEV_COLOR[selected.severity ?? "info"] ?? ""}>{selected.severity}</Badge>
                  <Badge className={STATUS_COLOR[selected.status ?? "open"] ?? ""}>{selected.status}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Message</div>
                  <div>{selected.message}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Recommended action</div>
                  <div>{selected.recommended_action ?? "—"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Business:</span> {selected.business_id?.slice(0, 8) ?? "—"}</div>
                  <div><span className="text-muted-foreground">Agent:</span> {selected.agent_id?.slice(0, 8) ?? "—"}</div>
                  <div><span className="text-muted-foreground">Campaign:</span> {selected.campaign_id?.slice(0, 8) ?? "—"}</div>
                  <div><span className="text-muted-foreground">Task:</span> {selected.task_id?.slice(0, 8) ?? "—"}</div>
                </div>
                {selected.audit_metadata && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Audit metadata</div>
                    <pre className="text-xs bg-muted/40 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selected.audit_metadata, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Linked ledger entries (recent)</div>
                  {(ledgerQ.data ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground">None.</div>
                  ) : (
                    <div className="space-y-1">
                      {(ledgerQ.data ?? []).map((l: any) => (
                        <div key={l.id} className="text-xs flex justify-between border-b border-border pb-1">
                          <span>{format(new Date(l.created_at), "HH:mm:ss")} · {l.task_category ?? "—"} · {l.model_tier ?? "—"}</span>
                          <span>£{Number(l.estimated_cost ?? 0).toFixed(4)} · {l.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FounderLayout>
  );
}