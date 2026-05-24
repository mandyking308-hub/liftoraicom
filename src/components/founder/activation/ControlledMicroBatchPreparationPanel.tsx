import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, Save, ListChecks, Layers } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CONFIRM = "PREPARE CONTROLLED MICRO BATCH";

const CHANNELS = [
  { key: "smartlead_cold_outreach", label: "Smartlead — Cold outreach" },
  { key: "native_email", label: "Native email (SMTP)" },
  { key: "apollo_candidate_pull", label: "Apollo — Candidate pull" },
  { key: "apollo_reveal", label: "Apollo — Email reveal" },
  { key: "metricool_social_schedule", label: "Metricool — Social schedule" },
  { key: "manychat_dm", label: "ManyChat — DM flow" },
  { key: "proposal_send", label: "Proposal send" },
  { key: "invoice_send", label: "Invoice send" },
  { key: "customer_onboarding_share", label: "Customer onboarding share" },
  { key: "customer_report_share", label: "Customer report share" },
  { key: "survey_send", label: "Survey send" },
  { key: "portal_invite", label: "Portal invite" },
  { key: "support_reply_send", label: "Support reply send" },
  { key: "winback_message_send", label: "Winback message send" },
];

export default function ControlledMicroBatchPreparationPanel() {
  const [businessId, setBusinessId] = useState("");
  const [channelKey, setChannelKey] = useState("smartlead_cold_outreach");
  const [phrase, setPhrase] = useState("");
  const [maxCandidates, setMaxCandidates] = useState(5);
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["mbp-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const body = useMemo(() => ({
    business_id: businessId || undefined,
    channel_key: channelKey,
    max_candidates: maxCandidates,
  }), [businessId, channelKey, maxCandidates]);

  const preview = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business");
      const { data, error } = await supabase.functions.invoke("business-micro-batch-prepare", {
        body: { ...body, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Preview: ${d.eligible_count} eligible / ${d.candidate_count} candidates`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business");
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-micro-batch-prepare", {
        body: { ...body, dry_run: false, confirmation_phrase: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Approval packet created • ${d.proposed_batch_size}/${d.max_batch_size}`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Controlled Micro-Batch Preparation
          <Badge variant="outline" className="ml-2"><Lock className="mr-1 h-3 w-3" /> Execution NOT allowed</Badge>
          <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External action blocked</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Channel</Label>
            <Select value={channelKey} onValueChange={setChannelKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max candidates (capped per channel)</Label>
            <Input type="number" min={1} max={50} value={maxCandidates}
              onChange={(e) => setMaxCandidates(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => preview.mutate()} disabled={preview.isPending || !businessId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Preview micro-batch
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/founder/micro-batch-preparation"><ListChecks className="mr-2 h-4 w-4" /> View candidates & packets</Link>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM} />
          <Button onClick={() => save.mutate()} disabled={save.isPending || phrase !== CONFIRM || !businessId}>
            <Save className="mr-2 h-4 w-4" /> Create approval packet
          </Button>
          <div className="text-xs text-muted-foreground">
            No send. No publish. No Apollo/Smartlead/Metricool/ManyChat call. No payment. No portal invite. No survey. No report share. No gate enable.
          </div>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.status}</Badge>
              <Badge variant="outline">Channel: {result.channel_key}</Badge>
              <Badge variant="outline">Candidates: {result.candidate_count}</Badge>
              <Badge variant="default">Eligible: {result.eligible_count}</Badge>
              <Badge variant={result.blocked_count > 0 ? "destructive" : "outline"}>Blocked: {result.blocked_count}</Badge>
              <Badge variant="outline">Warnings: {result.warning_count}</Badge>
              <Badge variant="outline">Batch: {result.proposed_batch_size}/{result.max_batch_size}</Badge>
              <Badge variant={result.gate_locked ? "outline" : "destructive"}>Gate: {result.gate_exists ? (result.gate_locked ? "locked" : "ENABLED") : "—"}</Badge>
              <Badge variant="outline">Provider: {result.provider_status}</Badge>
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> exec_allowed: false</Badge>
            </div>

            {(result.blocker_reasons ?? []).length > 0 && (
              <div className="flex items-start gap-2 text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">Blockers</div>
                  <ul className="list-disc pl-5">{result.blocker_reasons.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              </div>
            )}
            {(result.warnings ?? []).length > 0 && (
              <div className="text-xs text-muted-foreground">Warnings: {result.warnings.join("; ")}</div>
            )}

            {Array.isArray(result.candidates_preview) && result.candidates_preview.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 font-medium">Candidates preview ({result.candidates_preview.length})</div>
                <ul className="space-y-1">
                  {result.candidates_preview.map((c: any, i: number) => (
                    <li key={i} className="rounded border border-border/40 px-2 py-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{c.subject_or_title || c.candidate_type}</span>
                        <Badge variant={c.candidate_status === "eligible_for_founder_review" ? "default" : c.candidate_status === "blocked" ? "destructive" : "outline"}>{c.candidate_status}</Badge>
                      </div>
                      {(c.blocker_reasons?.length ?? 0) > 0 && <div className="text-amber-500">blockers: {c.blocker_reasons.join(", ")}</div>}
                      {(c.warnings?.length ?? 0) > 0 && <div className="text-muted-foreground">warnings: {c.warnings.join(", ")}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.approval_packet_preview && (
              <div className="text-xs">
                <div className="mb-1 font-medium">Approval packet (preview)</div>
                <div className="rounded border border-border/40 px-2 py-1">
                  <div className="font-medium">{result.approval_packet_preview.packet_title}</div>
                  <div className="text-muted-foreground">{result.approval_packet_preview.packet_summary}</div>
                  <div className="mt-1">Future execution phrase: <span className="font-mono">{result.approval_packet_preview.required_confirmation_phrase}</span></div>
                  {(result.approval_packet_preview.required_fixes_before_execution ?? []).length > 0 && (
                    <div className="mt-1">
                      <div className="font-medium">Required fixes before execution</div>
                      <ul className="list-disc pl-5">{result.approval_packet_preview.required_fixes_before_execution.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.preparation_run_id && (
              <div className="text-xs text-muted-foreground">
                Run id: <span className="font-mono">{result.preparation_run_id}</span>
                {result.approval_packet_id && <> • Packet id: <span className="font-mono">{result.approval_packet_id}</span></>}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Preparation only. This screen never sends, publishes, calls providers, spends credits, charges, invites, surveys, or enables any gate. External go-live remains LOCKED_BY_DESIGN.
        </div>
      </CardContent>
    </Card>
  );
}