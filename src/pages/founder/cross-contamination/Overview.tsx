import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, Activity, Wrench, Database, Bug } from "lucide-react";
import {
  runIntegrityScan,
  quarantineFinding,
  type ContaminationFinding,
  type Severity,
} from "@/lib/crossBusinessIntegrityEngine";

const SEV_CLS: Record<Severity, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  high: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  critical: "text-destructive border-destructive/40 bg-destructive/10",
};

export default function CrossContaminationOverview() {
  const qc = useQueryClient();
  const [simulate, setSimulate] = useState(true);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cross_business_integrity_scan"],
    queryFn: runIntegrityScan,
    refetchInterval: 120_000,
  });

  const repair = useMutation({
    mutationFn: async (f: ContaminationFinding) => quarantineFinding(f, !simulate),
    onSuccess: (res, f) => {
      if (!res.ok) {
        toast({ title: "Repair failed", description: res.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      toast({
        title: simulate ? "Simulated repair logged" : "Repair queued for approval",
        description: `${f.kind} · ${f.recordRef}`,
      });
      qc.invalidateQueries({ queryKey: ["cross_business_integrity_scan"] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" /> Cross-Business Integrity Engine
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Switch checked={simulate} onCheckedChange={setSimulate} id="sim" />
            <label htmlFor="sim" className="text-muted-foreground">Repair simulation mode</label>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <Activity className="h-3.5 w-3.5 mr-1" /> Re-scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Metric icon={Database} label="Links scanned" value={data?.totalLinks ?? 0} />
        <Metric icon={Database} label="Envelopes" value={data?.totalEnvelopes ?? 0} />
        <Metric icon={ShieldAlert} label="Critical" value={data?.bySeverity.critical ?? 0} tone="danger" />
        <Metric icon={ShieldAlert} label="High" value={data?.bySeverity.high ?? 0} tone="warn" />
        <Metric icon={Bug} label="Outbound blocks" value={data?.outboundBlocks ?? 0} tone={data?.outboundBlocks ? "danger" : undefined} />
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detected contamination</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-xs text-muted-foreground">Scanning…</div>
          ) : !data?.findings.length ? (
            <div className="text-xs text-emerald-300">No contamination detected. All cross-business links clean.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="text-left py-1.5">Severity</th>
                    <th className="text-left">Kind</th>
                    <th className="text-left">Record</th>
                    <th className="text-left">Affected businesses</th>
                    <th className="text-left">Summary</th>
                    <th className="text-left">Quarantine</th>
                    <th className="text-left">Repair</th>
                  </tr>
                </thead>
                <tbody>
                  {data.findings.map((f) => (
                    <tr key={f.id} className="border-b border-border/30 align-top">
                      <td className="py-1.5">
                        <Badge variant="outline" className={`text-[10px] ${SEV_CLS[f.severity]}`}>{f.severity}</Badge>
                      </td>
                      <td className="font-medium">{f.kind}</td>
                      <td className="font-mono text-[10px]">{f.recordRef}</td>
                      <td className="text-muted-foreground">
                        {f.affectedBusinesses.map((b) => b.slice(0, 8)).join(", ") || "—"}
                      </td>
                      <td className="text-muted-foreground max-w-xs">{f.summary}</td>
                      <td>
                        {f.quarantined ? (
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 bg-destructive/10">
                            Quarantined
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Active</Badge>
                        )}
                      </td>
                      <td>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          disabled={repair.isPending}
                          onClick={() => repair.mutate(f)}>
                          <Wrench className="h-3 w-3 mr-1" />
                          {simulate ? "Simulate" : "Queue repair"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detection coverage</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>wrong_business_link</strong> — links pointing to a non-existent envelope (critical, quarantined, outbound blocked).</p>
          <p>• <strong>mixed_crm_ownership</strong> — same CRM record owned by &gt;1 business (critical).</p>
          <p>• <strong>memory_contamination</strong> — memory module record crossing businesses (high).</p>
          <p>• <strong>wrong_campaign_ownership</strong> — campaign business mismatch vs expected owner map (high).</p>
          <p>• <strong>mismatched_envelope</strong> — link targets a different business's envelope (high).</p>
          <p>• <strong>orphaned_record</strong> — link missing business_id (medium).</p>
          <p>• <strong>invalid_module_relationship</strong> — module-to-module link not in allow-list (medium).</p>
          <p className="pt-2">Repair simulation logs a draft repair action without execution. Disable to queue for founder approval. Snapshot restore is available via the Backup &amp; Recovery panel.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone?: "warn" | "danger" }) {
  const cls = tone === "danger"
    ? "border-destructive/40 bg-destructive/5 text-destructive"
    : tone === "warn"
    ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
    : "border-border";
  return (
    <div className={`rounded-md border p-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}