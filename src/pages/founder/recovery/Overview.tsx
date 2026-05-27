import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Database, HardDrive, History, ShieldAlert, Camera, RotateCcw } from "lucide-react";
import {
  takeSnapshot, listSnapshots, listRecoveryActions, computeUsage,
  simulateRestore, applyRestore, isDangerousRestore, HEALTH_CLS,
  SNAPSHOT_SCOPES, type Snapshot, type SnapshotScope,
} from "@/lib/liftorRecoveryEngine";

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RecoveryOverview() {
  const qc = useQueryClient();
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [phrase, setPhrase] = useState("");

  const { data: snapshots = [] } = useQuery({
    queryKey: ["liftor_snapshots"], queryFn: () => listSnapshots(200), refetchInterval: 60_000,
  });
  const { data: actions = [] } = useQuery({
    queryKey: ["liftor_recovery_actions"], queryFn: () => listRecoveryActions(50), refetchInterval: 60_000,
  });
  const usage = computeUsage(snapshots);

  const takeMut = useMutation({
    mutationFn: async (scope: SnapshotScope) =>
      takeSnapshot(scope, `${scope} · ${new Date().toLocaleString()}`),
    onSuccess: (res, scope) => {
      if (!res.ok) {
        toast({ title: "Snapshot failed", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Snapshot captured", description: `${scope} · ${fmtBytes(res.snapshot!.byte_size)}` });
      }
      qc.invalidateQueries({ queryKey: ["liftor_snapshots"] });
      qc.invalidateQueries({ queryKey: ["liftor_recovery_actions"] });
    },
  });

  const simulateMut = useMutation({
    mutationFn: async (s: Snapshot) => simulateRestore(s),
    onSuccess: (res, s) => {
      toast({
        title: res.integrityOk ? "Simulated restore OK" : "Integrity check FAILED",
        description: `${s.scope} · ${s.label}`,
        variant: res.integrityOk ? "default" : "destructive",
      });
      qc.invalidateQueries({ queryKey: ["liftor_recovery_actions"] });
    },
  });

  const applyMut = useMutation({
    mutationFn: async ({ s, p }: { s: Snapshot; p: string }) => applyRestore(s, p),
    onSuccess: (res, { s }) => {
      if (!res.ok) {
        toast({ title: "Restore blocked", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Restore applied (logged)", description: `${s.scope} · ${s.label}` });
        setRestoreTarget(null);
        setPhrase("");
      }
      qc.invalidateQueries({ queryKey: ["liftor_recovery_actions"] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" /> Liftor Recovery Control Panel
        </h1>
        <Badge variant="outline" className="text-xs">
          {usage.totalSnapshots} snapshots · {fmtBytes(usage.totalBytes)} · {usage.failedCount} failed
        </Badge>
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> One-click snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {SNAPSHOT_SCOPES.map((scope) => {
              const b = usage.byScope[scope];
              return (
                <div key={scope} className="rounded-md border border-border p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold capitalize">{scope.replace("_", " ")}</span>
                    <Badge variant="outline" className={`text-[10px] ${HEALTH_CLS[b.health]}`}>{b.health}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {b.count} snap · {fmtBytes(b.bytes)}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 w-full text-[11px]"
                    disabled={takeMut.isPending}
                    onClick={() => takeMut.mutate(scope)}>
                    <Camera className="h-3 w-3 mr-1" /> Snapshot
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Restore point browser
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-xs text-muted-foreground">No snapshots yet. Capture one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="text-left py-1.5">When</th>
                    <th className="text-left">Scope</th>
                    <th className="text-left">Label</th>
                    <th className="text-left">Size</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id} className="border-b border-border/30 align-top">
                      <td className="py-1.5 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="font-medium capitalize">{s.scope.replace("_", " ")}</td>
                      <td className="text-muted-foreground truncate max-w-xs">{s.label}</td>
                      <td className="text-muted-foreground">{fmtBytes(s.byte_size)}</td>
                      <td>
                        <Badge variant="outline" className={`text-[10px] ${s.status === "failed" ? "text-destructive border-destructive/40" : ""}`}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="space-x-1">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => simulateMut.mutate(s)}>
                          Simulate
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => { setRestoreTarget(s); setPhrase(""); }}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
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
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Recovery action ledger (append-only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-xs text-muted-foreground">No recovery actions logged.</div>
          ) : (
            <ul className="text-xs space-y-1">
              {actions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border-b border-border/30 py-1">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${a.success ? "" : "text-destructive border-destructive/40"}`}>
                      {a.action}
                    </Badge>
                    <span className="text-muted-foreground">{a.target_scope ?? "—"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {a.dry_run ? "dry-run · " : ""}{new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {usage.failedCount > 0 && (
        <Card className="tech-card border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Failed backup alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {usage.failedCount} snapshot(s) failed. Review status column above and re-take.
          </CardContent>
        </Card>
      )}

      <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm restore</DialogTitle>
            <DialogDescription>
              {restoreTarget && (
                <>
                  Restoring <strong>{restoreTarget.scope}</strong> · {restoreTarget.label}
                  {isDangerousRestore(restoreTarget.scope) && (
                    <div className="mt-2 text-destructive">
                      This is a dangerous restore. Type <code className="font-mono">RESTORE NOW</code> to confirm.
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {restoreTarget && isDangerousRestore(restoreTarget.scope) && (
            <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="RESTORE NOW" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>Cancel</Button>
            <Button onClick={() => restoreTarget && applyMut.mutate({ s: restoreTarget, p: phrase })}
              disabled={applyMut.isPending}>
              Apply restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}