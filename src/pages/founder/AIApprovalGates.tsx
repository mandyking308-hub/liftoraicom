import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Clock, CheckCircle2, XCircle, Pencil, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatGBP } from "@/services/aiUsageLogger";
import AIQualityFeedbackDialog from "@/components/founder/ai/AIQualityFeedbackDialog";
import { Sparkles } from "lucide-react";
import {
  listPendingApprovals, decideApproval, isStale,
  type ApprovalRecord, type ApprovalStatus,
} from "@/services/aiApprovalGate";

function statusColor(s: string) {
  switch (s) {
    case "pending": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "approved": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "rejected": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "needs_changes": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "expired": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
function riskColor(r: string) {
  switch (r) {
    case "critical": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "standard": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "low": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function AIApprovalGates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = useState<ApprovalRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { data: businesses = [] } = useQuery({
    queryKey: ["approvals-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const businessName = (id: string | null) => id ? businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8) : "Unassigned";

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ai-approval-items"],
    queryFn: listPendingApprovals,
    refetchInterval: 15000,
  });

  const decide = useMutation({
    mutationFn: async (decision: "approved" | "rejected" | "needs_changes") => {
      if (!selected) return;
      await decideApproval({
        approval_id: selected.id,
        decision,
        founder_notes: notes || null,
        reviewed_by: user?.email ?? user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "Decision recorded" });
      qc.invalidateQueries({ queryKey: ["ai-approval-items"] });
      setSelected(null);
      setNotes("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const pending = items.filter((i) => i.status === "pending");
  const highRisk = pending.filter((i) => ["high", "critical"].includes(i.priority_level));
  const stale = pending.filter(isStale);

  const byBusiness = useMemo(() => {
    const m = new Map<string | null, ApprovalRecord[]>();
    for (const i of pending) {
      if (!m.has(i.business_id)) m.set(i.business_id, []);
      m.get(i.business_id)!.push(i);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [pending]);

  const byAgent = useMemo(() => {
    const m = new Map<string | null, ApprovalRecord[]>();
    for (const i of pending) {
      if (!m.has(i.agent_key)) m.set(i.agent_key, []);
      m.get(i.agent_key)!.push(i);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [pending]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> AI Human Approval Gates
          </h1>
          <p className="text-muted-foreground text-sm">
            External outreach, legal, financial, compliance, investor, acquisition, partnership and reputation-sensitive AI actions wait here. Nothing leaves Liftor until approved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={pending.length} />
          <StatCard icon={<ShieldAlert className="h-4 w-4 text-orange-400" />} label="High / critical risk" value={highRisk.length} />
          <StatCard icon={<Lock className="h-4 w-4 text-amber-400" />} label="Waiting >24h" value={stale.length} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} label="Decided (recent)" value={items.filter((i) => i.status !== "pending").length} />
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="high">High risk ({highRisk.length})</TabsTrigger>
            <TabsTrigger value="stale">Waiting too long ({stale.length})</TabsTrigger>
            <TabsTrigger value="business">By business</TabsTrigger>
            <TabsTrigger value="agent">By agent</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ApprovalTable rows={pending} onOpen={setSelected} businessName={businessName} />
          </TabsContent>
          <TabsContent value="high">
            <ApprovalTable rows={highRisk} onOpen={setSelected} businessName={businessName} />
          </TabsContent>
          <TabsContent value="stale">
            <ApprovalTable rows={stale} onOpen={setSelected} businessName={businessName} />
          </TabsContent>
          <TabsContent value="business">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {byBusiness.map(([bid, rows]) => (
                <Card key={bid ?? "null"} className="tech-card">
                  <CardHeader className="pb-2"><CardTitle className="text-base">{businessName(bid)}</CardTitle><CardDescription>{rows.length} pending</CardDescription></CardHeader>
                  <CardContent><ApprovalCompact rows={rows} onOpen={setSelected} /></CardContent>
                </Card>
              ))}
              {byBusiness.length === 0 && <p className="text-sm text-muted-foreground">No pending approvals.</p>}
            </div>
          </TabsContent>
          <TabsContent value="agent">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {byAgent.map(([aid, rows]) => (
                <Card key={aid ?? "null"} className="tech-card">
                  <CardHeader className="pb-2"><CardTitle className="text-base">{aid ?? "Unassigned agent"}</CardTitle><CardDescription>{rows.length} pending</CardDescription></CardHeader>
                  <CardContent><ApprovalCompact rows={rows} onOpen={setSelected} /></CardContent>
                </Card>
              ))}
              {byAgent.length === 0 && <p className="text-sm text-muted-foreground">No pending approvals.</p>}
            </div>
          </TabsContent>
          <TabsContent value="all">
            <ApprovalTable rows={items} onOpen={setSelected} businessName={businessName} showStatus />
          </TabsContent>
        </Tabs>

        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNotes(""); } }}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> {selected.title}
                </DialogTitle>
                <DialogDescription>
                  Approval for <span className="font-mono">{selected.approval_type}</span> · {businessName(selected.business_id)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={statusColor(selected.status)}>{selected.status}</Badge>
                  <Badge variant="outline" className={riskColor(selected.priority_level)}>risk: {selected.priority_level}</Badge>
                  {(selected.metadata as any)?.estimated_cost != null && (
                    <Badge variant="outline">cost: {formatGBP(Number((selected.metadata as any).estimated_cost))}</Badge>
                  )}
                  {(selected.metadata as any)?.value_at_stake != null && (
                    <Badge variant="outline">value at stake: {formatGBP(Number((selected.metadata as any).value_at_stake))}</Badge>
                  )}
                </div>

                <Field label="Why approval required">
                  {(selected.metadata as any)?.reason_approval_required ?? "—"}
                </Field>
                <Field label="Summary">{selected.summary ?? "—"}</Field>
                <Field label="Proposed action">
                  {(selected.metadata as any)?.proposed_action ?? selected.recommended_action ?? "—"}
                </Field>
                {(selected.draft_subject || selected.draft_body) && (
                  <div className="rounded-md border border-border p-3 bg-muted/20 space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">Draft (will NOT send until approved)</div>
                    {selected.draft_subject && <div className="font-medium">{selected.draft_subject}</div>}
                    {selected.draft_body && <pre className="text-xs whitespace-pre-wrap">{selected.draft_body}</pre>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Created: {new Date(selected.created_at).toLocaleString()}</div>
                  {selected.decided_at && <div>Decided: {new Date(selected.decided_at).toLocaleString()}</div>}
                  {(selected.metadata as any)?.ai_usage_ledger_id && (
                    <div className="col-span-2 font-mono">Ledger: {(selected.metadata as any).ai_usage_ledger_id}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase text-muted-foreground">Founder notes</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note about decision…" />
                </div>
              </div>

              <DialogFooter className="gap-2">
                {selected.status === "pending" ? (
                  <>
                    <Button variant="outline" onClick={() => decide.mutate("needs_changes")} disabled={decide.isPending}>
                      <Pencil className="h-4 w-4 mr-1" /> Request changes
                    </Button>
                    <Button variant="destructive" onClick={() => decide.mutate("rejected")} disabled={decide.isPending}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button onClick={() => decide.mutate("approved")} disabled={decide.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Decision already recorded.</span>
                )}
                {(selected.metadata as any)?.ai_usage_ledger_id && (
                  <Button variant="outline" onClick={() => setFeedbackOpen(true)}>
                    <Sparkles className="h-4 w-4 mr-1" /> Rate output
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AIQualityFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        ai_usage_ledger_id={(selected?.metadata as any)?.ai_usage_ledger_id ?? null}
        context_title={selected?.title}
      />
    </FounderLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="tech-card">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ApprovalTable({
  rows, onOpen, businessName, showStatus,
}: {
  rows: ApprovalRecord[]; onOpen: (r: ApprovalRecord) => void; businessName: (id: string | null) => string; showStatus?: boolean;
}) {
  return (
    <Card className="tech-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Age</TableHead>
              {showStatus && <TableHead>Status</TableHead>}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const ageH = Math.round((Date.now() - new Date(r.created_at).getTime()) / 3.6e6);
              const cost = (r.metadata as any)?.estimated_cost;
              return (
                <TableRow key={r.id} className={isStale(r) ? "bg-amber-500/5" : undefined}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="font-mono text-xs">{r.approval_type}</TableCell>
                  <TableCell>{businessName(r.business_id)}</TableCell>
                  <TableCell><Badge variant="outline" className={riskColor(r.priority_level)}>{r.priority_level}</Badge></TableCell>
                  <TableCell>{cost != null ? formatGBP(Number(cost)) : "—"}</TableCell>
                  <TableCell className={isStale(r) ? "text-amber-400" : ""}>{ageH}h</TableCell>
                  {showStatus && <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>}
                  <TableCell><Button size="sm" variant="outline" onClick={() => onOpen(r)}>Review</Button></TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={showStatus ? 8 : 7} className="text-center text-muted-foreground py-6">Nothing here.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApprovalCompact({ rows, onOpen }: { rows: ApprovalRecord[]; onOpen: (r: ApprovalRecord) => void }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="flex justify-between items-center text-sm">
          <div className="truncate mr-2">
            <Badge variant="outline" className={riskColor(r.priority_level) + " mr-2"}>{r.priority_level}</Badge>
            {r.title}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onOpen(r)}>Open</Button>
        </li>
      ))}
    </ul>
  );
}