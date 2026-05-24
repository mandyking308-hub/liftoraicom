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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Siren, PauseCircle, PlayCircle, ShieldAlert, RefreshCw } from "lucide-react";
import { pauseAll, resumeAll, pauseScope, resumeScope } from "@/services/aiQueueControl";
import { formatGBP } from "@/services/aiUsageLogger";

type QueueRow = {
  id: string;
  created_at: string;
  business_id: string | null;
  agent_id: string | null;
  campaign_id: string | null;
  task_category: string;
  action_type: string;
  status: string;
  priority: string;
  estimated_cost: number;
  retry_count: number;
  max_retries: number;
  block_reason: string | null;
  selected_model_tier: string | null;
  requested_model_tier: string | null;
  audit_metadata: Record<string, unknown> | null;
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "secondary",
  running: "default",
  completed: "outline",
  failed: "destructive",
  blocked: "destructive",
  cancelled: "outline",
  requires_approval: "secondary",
  duplicate_prevented: "outline",
};

export default function AIQueueControl() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [scopePauseOpen, setScopePauseOpen] = useState<null | { kind: "business" | "agent" | "campaign" }>(null);
  const [scopeId, setScopeId] = useState("");

  const killSwitch = useQuery({
    queryKey: ["ai_kill_switch"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_kill_switch_state").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const queue = useQuery({
    queryKey: ["ai_action_queue", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("ai_action_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QueueRow[];
    },
    refetchInterval: 15000,
  });

  const counts = useMemo(() => {
    const all = queue.data ?? [];
    const acc: Record<string, number> = {};
    let queuedCost = 0;
    for (const r of all) {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      if (r.status === "queued" || r.status === "running") queuedCost += Number(r.estimated_cost ?? 0);
    }
    return { acc, queuedCost };
  }, [queue.data]);

  const rateLimits = useQuery({
    queryKey: ["ai_rate_limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_rate_limits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pauseAllMut = useMutation({
    mutationFn: async () => {
      if (!pauseReason.trim()) throw new Error("Reason required");
      await pauseAll(pauseReason.trim(), user?.id ?? null);
    },
    onSuccess: () => {
      toast({ title: "Global AI paused", description: "All AI actions are now blocked." });
      setPauseOpen(false); setPauseReason("");
      qc.invalidateQueries({ queryKey: ["ai_kill_switch"] });
    },
    onError: (e: any) => toast({ title: "Failed to pause", description: e.message, variant: "destructive" }),
  });

  const resumeAllMut = useMutation({
    mutationFn: async () => { await resumeAll(user?.id ?? null); },
    onSuccess: () => {
      toast({ title: "Global AI resumed" });
      setResumeOpen(false);
      qc.invalidateQueries({ queryKey: ["ai_kill_switch"] });
    },
  });

  const pauseScopeMut = useMutation({
    mutationFn: async () => {
      if (!scopePauseOpen || !scopeId.trim()) throw new Error("Scope ID required");
      await pauseScope(scopePauseOpen.kind, scopeId.trim(), pauseReason || "Paused by founder", user?.id ?? null);
    },
    onSuccess: () => {
      toast({ title: "Scope paused" });
      setScopePauseOpen(null); setScopeId(""); setPauseReason("");
      qc.invalidateQueries({ queryKey: ["ai_kill_switch"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const unpauseScopeMut = useMutation({
    mutationFn: async (args: { kind: "business" | "agent" | "campaign"; id: string }) => {
      await resumeScope(args.kind, args.id, user?.id ?? null);
    },
    onSuccess: () => {
      toast({ title: "Scope resumed" });
      qc.invalidateQueries({ queryKey: ["ai_kill_switch"] });
    },
  });

  const cancelRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_action_queue")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cancelled" });
      qc.invalidateQueries({ queryKey: ["ai_action_queue"] });
    },
  });

  const ks = killSwitch.data as any;
  const globalPaused = !!ks?.global_ai_paused;

  return (
    <FounderLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" /> AI Queue Control & Kill Switch
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pause AI globally or by scope. Enforce rate limits, idempotency and loop detection before any AI action runs.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { queue.refetch(); killSwitch.refetch(); rateLimits.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Kill switch state */}
        <Card className={globalPaused ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {globalPaused ? <PauseCircle className="h-5 w-5 text-destructive" /> : <PlayCircle className="h-5 w-5 text-primary" />}
              Global Kill Switch
              <Badge variant={globalPaused ? "destructive" : "secondary"} className="ml-2">
                {globalPaused ? "PAUSED" : "ACTIVE"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {globalPaused && (
              <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm">
                <p className="font-medium">All AI actions are currently blocked.</p>
                <p className="text-muted-foreground mt-1">Reason: {ks?.pause_reason ?? "—"}</p>
                <p className="text-muted-foreground">Paused at: {ks?.paused_at ? format(new Date(ks.paused_at), "Pp") : "—"}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {globalPaused ? (
                <Button variant="default" onClick={() => setResumeOpen(true)}>
                  <PlayCircle className="h-4 w-4 mr-1" /> Resume All AI
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setPauseOpen(true)}>
                  <PauseCircle className="h-4 w-4 mr-1" /> Pause All AI
                </Button>
              )}
              <Button variant="outline" onClick={() => setScopePauseOpen({ kind: "business" })}>Pause business</Button>
              <Button variant="outline" onClick={() => setScopePauseOpen({ kind: "agent" })}>Pause agent</Button>
              <Button variant="outline" onClick={() => setScopePauseOpen({ kind: "campaign" })}>Pause campaign</Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ScopedPausedList label="Paused businesses" ids={ks?.paused_business_ids ?? []} onResume={(id) => unpauseScopeMut.mutate({ kind: "business", id })} />
              <ScopedPausedList label="Paused agents" ids={ks?.paused_agent_ids ?? []} onResume={(id) => unpauseScopeMut.mutate({ kind: "agent", id })} />
              <ScopedPausedList label="Paused campaigns" ids={ks?.paused_campaign_ids ?? []} onResume={(id) => unpauseScopeMut.mutate({ kind: "campaign", id })} />
            </div>
          </CardContent>
        </Card>

        {/* Counts */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Queued" value={counts.acc.queued ?? 0} />
          <StatCard label="Running" value={counts.acc.running ?? 0} />
          <StatCard label="Requires approval" value={counts.acc.requires_approval ?? 0} />
          <StatCard label="Blocked" value={counts.acc.blocked ?? 0} tone="destructive" />
          <StatCard label="Failed" value={counts.acc.failed ?? 0} tone="destructive" />
          <StatCard label="Duplicates prevented" value={counts.acc.duplicate_prevented ?? 0} />
          <StatCard label="Queued cost (est.)" value={formatGBP(counts.queuedCost)} />
        </div>

        {/* Queue table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Siren className="h-5 w-5" /> Action queue</CardTitle>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="requires_approval">Requires approval</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="duplicate_prevented">Duplicate prevented</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Est. cost</TableHead>
                  <TableHead>Reason / detail</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queue.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), "Pp")}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{r.action_type}</TableCell>
                    <TableCell className="text-xs">{r.task_category}</TableCell>
                    <TableCell className="text-xs">{r.priority}</TableCell>
                    <TableCell className="text-xs">{r.retry_count}/{r.max_retries}</TableCell>
                    <TableCell className="text-xs">{formatGBP(Number(r.estimated_cost ?? 0))}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={r.block_reason ?? ""}>{r.block_reason ?? "—"}</TableCell>
                    <TableCell>
                      {["queued", "requires_approval"].includes(r.status) && (
                        <Button size="sm" variant="outline" onClick={() => cancelRow.mutate(r.id)}>Cancel</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(queue.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No queued actions.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Rate limits */}
        <RateLimitsCard rows={rateLimits.data ?? []} onChange={() => rateLimits.refetch()} />
      </div>

      {/* Pause All dialog */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause all AI</DialogTitle>
            <DialogDescription>
              No AI actions will run anywhere until you resume. This affects all businesses, agents and campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (required)</Label>
            <Textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="Why are you pausing?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => pauseAllMut.mutate()} disabled={pauseAllMut.isPending}>Confirm pause</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume confirmation */}
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume all AI?</DialogTitle>
            <DialogDescription>
              AI actions will be allowed to run again, subject to per-business, per-agent, per-campaign pauses and rate limits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeOpen(false)}>Cancel</Button>
            <Button onClick={() => resumeAllMut.mutate()} disabled={resumeAllMut.isPending}>Confirm resume</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scope pause */}
      <Dialog open={!!scopePauseOpen} onOpenChange={(o) => !o && setScopePauseOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause {scopePauseOpen?.kind}</DialogTitle>
            <DialogDescription>AI actions for this {scopePauseOpen?.kind} will be blocked until resumed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{scopePauseOpen?.kind} ID (UUID)</Label>
              <Input value={scopeId} onChange={(e) => setScopeId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopePauseOpen(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => pauseScopeMut.mutate()} disabled={pauseScopeMut.isPending}>Pause</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FounderLayout>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "destructive" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ScopedPausedList({ label, ids, onResume }: { label: string; ids: string[]; onResume: (id: string) => void }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {ids.length === 0 && <p className="text-xs text-muted-foreground mt-1">None</p>}
      <ul className="mt-2 space-y-1">
        {ids.map((id) => (
          <li key={id} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono truncate" title={id}>{id}</span>
            <Button size="sm" variant="ghost" onClick={() => onResume(id)}>Resume</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type RateLimitRow = {
  id: string;
  scope_type: string;
  scope_id: string | null;
  task_category: string | null;
  per_hour_limit: number | null;
  per_day_limit: number | null;
  enabled: boolean;
  notes: string | null;
};

function RateLimitsCard({ rows, onChange }: { rows: any[]; onChange: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<RateLimitRow>>({ scope_type: "global", enabled: true });

  const save = async () => {
    if (!form.scope_type) return;
    const payload: any = {
      scope_type: form.scope_type,
      scope_id: form.scope_id || null,
      task_category: form.task_category || null,
      per_hour_limit: form.per_hour_limit ? Number(form.per_hour_limit) : null,
      per_day_limit: form.per_day_limit ? Number(form.per_day_limit) : null,
      enabled: form.enabled ?? true,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("ai_rate_limits").insert(payload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Rate limit saved" });
    setOpen(false);
    setForm({ scope_type: "global", enabled: true });
    onChange();
  };

  const toggle = async (r: RateLimitRow) => {
    await supabase.from("ai_rate_limits").update({ enabled: !r.enabled }).eq("id", r.id);
    onChange();
  };

  const remove = async (id: string) => {
    await supabase.from("ai_rate_limits").delete().eq("id", id);
    onChange();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rate limits</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>Add rule</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Scope ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Per hour</TableHead>
              <TableHead>Per day</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: RateLimitRow) => (
              <TableRow key={r.id}>
                <TableCell>{r.scope_type}</TableCell>
                <TableCell className="font-mono text-xs">{r.scope_id ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.task_category ?? "—"}</TableCell>
                <TableCell>{r.per_hour_limit ?? "—"}</TableCell>
                <TableCell>{r.per_day_limit ?? "—"}</TableCell>
                <TableCell><Switch checked={r.enabled} onCheckedChange={() => toggle(r)} /></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Delete</Button></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No rate limits configured. AI will run without throttling.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add rate limit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Scope</Label>
              <Select value={form.scope_type} onValueChange={(v) => setForm({ ...form, scope_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="task_category">Task category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope_type !== "global" && form.scope_type !== "task_category" && (
              <div>
                <Label>Scope ID</Label>
                <Input value={form.scope_id ?? ""} onChange={(e) => setForm({ ...form, scope_id: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Task category (optional)</Label>
              <Input value={form.task_category ?? ""} onChange={(e) => setForm({ ...form, task_category: e.target.value })} placeholder="e.g. email_classification" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Per hour</Label>
                <Input type="number" value={form.per_hour_limit ?? ""} onChange={(e) => setForm({ ...form, per_hour_limit: e.target.value as any })} />
              </div>
              <div>
                <Label>Per day</Label>
                <Input type="number" value={form.per_day_limit ?? ""} onChange={(e) => setForm({ ...form, per_day_limit: e.target.value as any })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}