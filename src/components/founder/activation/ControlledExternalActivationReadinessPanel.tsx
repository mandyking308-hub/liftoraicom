import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, Save, ListChecks, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CONFIRM = "RUN EXTERNAL ACTIVATION READINESS CHECK";

export default function ControlledExternalActivationReadinessPanel() {
  const [businessId, setBusinessId] = useState<string>("");
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["bear-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const body = useMemo(() => ({ business_id: businessId || undefined }), [businessId]);

  const preview = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      const { data, error } = await supabase.functions.invoke("business-external-activation-readiness-run", {
        body: { ...body, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Preview: ${d.readiness_score}/100 • ${d.recommended_mode}`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-external-activation-readiness-run", {
        body: { ...body, dry_run: false, confirmation_phrase: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Readiness plan saved • ${d.recommended_mode}`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Controlled External Activation Readiness
          <Badge variant="outline" className="ml-2"><Lock className="mr-1 h-3 w-3" /> External activation NOT allowed</Badge>
          <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> All gates locked</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Business</Label>
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent>
              {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => preview.mutate()} disabled={preview.isPending || !businessId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Preview external readiness
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/founder/external-activation-readiness"><ListChecks className="mr-2 h-4 w-4" /> View channel checks & plans</Link>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM} />
          <Button onClick={() => save.mutate()} disabled={save.isPending || phrase !== CONFIRM || !businessId}>
            <Save className="mr-2 h-4 w-4" /> Save readiness plan
          </Button>
          <div className="text-xs text-muted-foreground">No gate enable. No send. No publish. No Apollo/Smartlead execution. No payment.</div>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.status}</Badge>
              <Badge variant="outline">Score: {result.readiness_score}/100</Badge>
              <Badge variant="outline">Mode: {result.recommended_mode}</Badge>
              <Badge variant={result.internal_ready ? "default" : "outline"}>Internal ready: {String(result.internal_ready)}</Badge>
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External activation allowed: false</Badge>
              <Badge variant={result.all_external_gates_locked ? "default" : "destructive"}>Gates locked: {String(result.all_external_gates_locked)}</Badge>
              <Badge variant="outline">First batch: {result.recommended_first_batch_size}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Channels: {result.channel_count}</Badge>
              <Badge variant="outline">Ready: {result.channels_ready}</Badge>
              <Badge variant="outline">Warning: {result.channels_warning}</Badge>
              <Badge variant="outline">Blocked: {result.channels_blocked}</Badge>
              <Badge variant="outline">Compliance: {String(result.compliance_ready)}</Badge>
              <Badge variant="outline">CRM: {String(result.crm_ready)}</Badge>
              <Badge variant="outline">Knowledge: {String(result.knowledge_ready)}</Badge>
              <Badge variant="outline">Drafts: {String(result.draft_assets_ready)}</Badge>
              <Badge variant="outline">Provider lanes: {String(result.provider_lanes_ready)}</Badge>
            </div>

            {(result.blocker_reasons ?? []).length > 0 && (
              <div className="flex items-start gap-2 text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">Blockers</div>
                  <ul className="list-disc pl-5">
                    {result.blocker_reasons.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {(result.warnings ?? []).length > 0 && (
              <div className="text-xs text-muted-foreground">Warnings: {result.warnings.join("; ")}</div>
            )}

            {Array.isArray(result.channel_checks) && (
              <div className="text-xs">
                <div className="mb-1 font-medium">Channel readiness ({result.channel_checks.length})</div>
                <ul className="space-y-1">
                  {result.channel_checks.map((c: any) => (
                    <li key={c.channel_key} className="rounded border border-border/40 px-2 py-1">
                      <div className="flex items-center justify-between">
                        <span>{c.channel_name}</span>
                        <span className="flex flex-wrap gap-1">
                          <Badge variant={c.channel_status === "ready_for_founder_review" ? "default" : c.channel_status === "blocked" ? "destructive" : "outline"}>{c.channel_status}</Badge>
                          {c.secret_required && <Badge variant="outline">{c.secret_present ? "secret✓" : "secret✗"}</Badge>}
                          <Badge variant="outline">gate {c.gate_exists ? (c.gate_enabled ? "ENABLED" : "locked") : "—"}</Badge>
                          <Badge variant="outline">batch≤{c.recommended_first_batch_size}</Badge>
                        </span>
                      </div>
                      {c.next_safe_action && <div className="mt-1 text-muted-foreground">{c.next_safe_action}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.activation_plan && (
              <div className="text-xs">
                <div className="mb-1 font-medium">Controlled activation plan (preview)</div>
                <div className="rounded border border-border/40 px-2 py-1">
                  <div className="font-medium">{result.activation_plan.plan_title}</div>
                  <div className="text-muted-foreground">{result.activation_plan.plan_summary}</div>
                  <ol className="mt-1 list-decimal pl-5">
                    {result.activation_plan.recommended_sequence.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Readiness check only. No sends, no publishing, no Apollo, no Smartlead, no Metricool, no ManyChat, no payments, no portal invites, no surveys/reports. External go-live remains LOCKED_BY_DESIGN.
        </div>
      </CardContent>
    </Card>
  );
}