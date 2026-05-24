import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import ControlledMicroBatchPreparationPanel from "@/components/founder/activation/ControlledMicroBatchPreparationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";

export default function MicroBatchPreparationPage() {
  const [businessId, setBusinessId] = useState("");

  const { data: businesses = [] } = useQuery({
    queryKey: ["mbp-page-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["mbp-runs", businessId],
    queryFn: async () => {
      const q = supabase.from("business_micro_batch_preparation_runs")
        .select("id,business_id,channel_key,run_status,candidate_count,eligible_count,blocked_count,warning_count,prepared_batch_size,max_allowed_batch_size,execution_allowed,external_action_blocked,gate_locked,created_at")
        .order("created_at", { ascending: false }).limit(60);
      const { data } = businessId ? await q.eq("business_id", businessId) : await q;
      return data ?? [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["mbp-cands", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase.from("business_micro_batch_candidates")
        .select("id,channel_key,candidate_type,candidate_status,subject_or_title,blocker_reasons,warnings,created_at")
        .eq("business_id", businessId).order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: packets = [] } = useQuery({
    queryKey: ["mbp-packets", businessId],
    queryFn: async () => {
      const q = supabase.from("business_micro_batch_approval_packets")
        .select("id,business_id,channel_key,packet_status,packet_title,packet_summary,proposed_batch_size,max_batch_size,eligible_candidate_count,blocked_candidate_count,execution_allowed,external_action_blocked,required_confirmation_phrase,created_at")
        .order("created_at", { ascending: false }).limit(40);
      const { data } = businessId ? await q.eq("business_id", businessId) : await q;
      return data ?? [];
    },
  });

  const summary = {
    businesses: businesses.length,
    total_packets: packets.length,
    needs_review: packets.filter((p: any) => p.packet_status === "needs_founder_review").length,
    blocked_packets: packets.filter((p: any) => p.packet_status === "blocked").length,
    internally_ready: packets.filter((p: any) => p.packet_status === "internally_approved_for_future_execution").length,
    exec_violations: packets.filter((p: any) => p.execution_allowed === true || p.external_action_blocked === false).length
      + runs.filter((r: any) => r.execution_allowed === true || r.external_action_blocked === false || r.gate_locked === false).length,
  };

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Controlled Micro-Batch Preparation</h1>
        <p className="text-sm text-muted-foreground">
          Prepare a tiny, controlled micro-batch for one selected channel and one business. No sending, publishing, or
          provider mutation happens here. Execution remains <span className="font-medium">LOCKED_BY_DESIGN</span> and must be performed
          in a future channel-specific prompt.
        </p>

        <Card className="tech-card">
          <CardHeader><CardTitle>Multi-business / channel summary</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Businesses: {summary.businesses}</Badge>
            <Badge variant="outline">Packets: {summary.total_packets}</Badge>
            <Badge variant="outline">Needs founder review: {summary.needs_review}</Badge>
            <Badge variant="outline">Blocked: {summary.blocked_packets}</Badge>
            <Badge variant="outline">Ready for future execution review: {summary.internally_ready}</Badge>
            <Badge variant={summary.exec_violations > 0 ? "destructive" : "default"}><Lock className="mr-1 h-3 w-3" /> Execution-allowed rows: {summary.exec_violations}</Badge>
          </CardContent>
        </Card>

        <ControlledMicroBatchPreparationPanel />

        <Card className="tech-card">
          <CardHeader><CardTitle>Filter by business</CardTitle></CardHeader>
          <CardContent>
            <Label>Business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue placeholder="All businesses" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>Approval packets ({packets.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {packets.map((p: any) => (
                <li key={p.id} className="rounded border border-border/40 px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{p.packet_title}</span>
                    <span className="flex flex-wrap gap-1">
                      <Badge variant="outline">{p.channel_key}</Badge>
                      <Badge variant={p.packet_status === "needs_founder_review" ? "default" : p.packet_status === "blocked" ? "destructive" : "outline"}>{p.packet_status}</Badge>
                      <Badge variant="outline">batch {p.proposed_batch_size}/{p.max_batch_size}</Badge>
                      <Badge variant="outline">eligible {p.eligible_candidate_count}</Badge>
                      {(p.execution_allowed || p.external_action_blocked === false) && <Badge variant="destructive">UNSAFE</Badge>}
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground">{p.packet_summary}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>Preparation runs ({runs.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {runs.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  <span className="flex flex-wrap gap-1">
                    <Badge variant="outline">{r.channel_key}</Badge>
                    <Badge variant="outline">{r.run_status}</Badge>
                    <Badge variant="outline">cand:{r.candidate_count}</Badge>
                    <Badge variant="outline">elig:{r.eligible_count}</Badge>
                    <Badge variant="outline">blocked:{r.blocked_count}</Badge>
                    <Badge variant="outline">warn:{r.warning_count}</Badge>
                    <Badge variant="outline">batch:{r.prepared_batch_size}/{r.max_allowed_batch_size}</Badge>
                    {(r.execution_allowed || !r.external_action_blocked || !r.gate_locked) && <Badge variant="destructive">UNSAFE</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {businessId && (
          <Card className="tech-card">
            <CardHeader><CardTitle>Candidates ({candidates.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {candidates.map((c: any) => (
                  <li key={c.id} className="rounded border border-border/40 px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{c.subject_or_title || c.candidate_type}</span>
                      <span className="flex flex-wrap gap-1">
                        <Badge variant="outline">{c.channel_key}</Badge>
                        <Badge variant={c.candidate_status === "eligible_for_founder_review" ? "default" : c.candidate_status === "blocked" ? "destructive" : "outline"}>{c.candidate_status}</Badge>
                      </span>
                    </div>
                    {Array.isArray(c.blocker_reasons) && c.blocker_reasons.length > 0 && <div className="text-amber-500">blockers: {c.blocker_reasons.join(", ")}</div>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
}