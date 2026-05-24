import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, PlayCircle, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CONFIRM = "RUN BUSINESS DAILY OPERATING LOOP";

export default function BusinessDailyOperatingLoopPanel() {
  const [businessId, setBusinessId] = useState<string>("");
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["bdol-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: activation } = useQuery({
    queryKey: ["bdol-activation", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_internal_activation_records")
        .select("id,activation_status,activation_mode,readiness_score,internal_ready,external_ready")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["bdol-recent", businessId],
    queryFn: async () => {
      let q = supabase
        .from("business_daily_operating_runs")
        .select("id,business_id,run_date,run_status,actions_loaded,actions_completed,actions_blocked,actions_parked,created_at,is_test_data")
        .order("created_at", { ascending: false }).limit(8);
      if (businessId) q = q.eq("business_id", businessId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const body = useMemo(() => ({ business_id: businessId || undefined }), [businessId]);

  const preview = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      const { data, error } = await supabase.functions.invoke("business-daily-operating-run", {
        body: { ...body, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Preview: ${d.actions_loaded ?? 0} actions, ${d.outputs_preview?.length ?? 0} planned outputs`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const run = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-daily-operating-run", {
        body: { ...body, dry_run: false, confirmation_phrase: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Loop: ${d.status} • outputs ${d.outputs_created ?? 0}`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Today's Business Operating Loop
          <Badge variant="outline" className="ml-2">
            <Lock className="mr-1 h-3 w-3" />
            External actions locked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {activation ? (
              <>
                <Badge variant="outline">Activation: {activation.activation_status}</Badge>
                <Badge variant="outline">Mode: {activation.activation_mode}</Badge>
                <Badge variant="outline">Readiness: {activation.readiness_score}/100</Badge>
                <Badge variant={activation.internal_ready ? "default" : "outline"}>Internal ready: {String(activation.internal_ready)}</Badge>
              </>
            ) : (
              <Badge variant="outline">No internal activation record</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => preview.mutate()} disabled={preview.isPending || !businessId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Preview today's internal loop
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/founder/business-daily-operating-loop"><ListChecks className="mr-2 h-4 w-4" /> View outputs & history</Link>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM} />
          <Button onClick={() => run.mutate()} disabled={run.isPending || phrase !== CONFIRM || !businessId}>
            <PlayCircle className="mr-2 h-4 w-4" /> Run today's internal loop
          </Button>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.status}</Badge>
              <Badge variant="outline">Provider: {result.provider_status}</Badge>
              <Badge variant="outline">Actions loaded: {result.actions_loaded ?? 0}</Badge>
              <Badge variant="outline">Internal done: {result.actions_completed ?? 0}</Badge>
              <Badge variant="outline">Blocked: {result.actions_blocked ?? 0}</Badge>
              <Badge variant="outline">Parked: {result.actions_parked ?? 0}</Badge>
              <Badge variant="outline">Runbook open: {result.runbook_items_loaded ?? 0}</Badge>
              <Badge variant="outline">Outputs: {result.outputs_created ?? result.outputs_preview?.length ?? 0}</Badge>
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External: false</Badge>
            </div>
            {result.internal_run_summary && (
              <div className="text-xs text-muted-foreground">{result.internal_run_summary}</div>
            )}
            {(result.missing_context ?? []).length > 0 && (
              <div className="flex items-start gap-2 text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <ul className="list-disc pl-5">
                  {result.missing_context.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
            {(result.risk_warnings ?? []).length > 0 && (
              <div className="text-xs text-muted-foreground">Risks: {result.risk_warnings.join("; ")}</div>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <div className="text-xs">
            <div className="mb-1 font-medium">Recent daily runs</div>
            <ul className="space-y-1">
              {recent.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{r.run_date} • {new Date(r.created_at).toLocaleTimeString()}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{r.run_status}</Badge>
                    <Badge variant="outline">a:{r.actions_loaded}</Badge>
                    <Badge variant="outline">b:{r.actions_blocked}</Badge>
                    {r.is_test_data && <Badge variant="outline">test</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Internal operating loop only. No sends, no publish, no Apollo, no Smartlead, no payments, no portal invites. External go-live remains LOCKED_BY_DESIGN.
        </div>
      </CardContent>
    </Card>
  );
}