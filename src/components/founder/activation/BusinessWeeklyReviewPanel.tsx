import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, PlayCircle, ListChecks, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CONFIRM = "RUN BUSINESS WEEKLY REVIEW";

function defaultWeek() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 86400000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function BusinessWeeklyReviewPanel() {
  const [businessId, setBusinessId] = useState<string>("");
  const [{ start, end }, setRange] = useState(defaultWeek());
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["bwr-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: activation } = useQuery({
    queryKey: ["bwr-activation", businessId],
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
    queryKey: ["bwr-recent", businessId],
    queryFn: async () => {
      let q = supabase
        .from("business_weekly_review_runs")
        .select("id,business_id,week_start,week_end,run_status,score_overall,score_readiness,internal_ready,external_ready,is_test_data,created_at")
        .order("created_at", { ascending: false }).limit(8);
      if (businessId) q = q.eq("business_id", businessId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const body = useMemo(() => ({ business_id: businessId || undefined, week_start: start, week_end: end }), [businessId, start, end]);

  const preview = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      const { data, error } = await supabase.functions.invoke("business-weekly-review-run", {
        body: { ...body, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Preview: score ${d.scorecard?.score_overall ?? 0}, ${d.outputs_preview?.length ?? 0} planned outputs`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const run = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-weekly-review-run", {
        body: { ...body, dry_run: false, confirmation_phrase: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Weekly review: ${d.status} • outputs ${d.outputs_created ?? 0}`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const sc = result?.scorecard ?? {};

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5" />
          Weekly Business Review / Learning Loop
          <Badge variant="outline" className="ml-2">
            <Lock className="mr-1 h-3 w-3" />
            External actions locked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
            <Label>Week start</Label>
            <Input type="date" value={start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
          </div>
          <div>
            <Label>Week end</Label>
            <Input type="date" value={end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
          </div>
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

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => preview.mutate()} disabled={preview.isPending || !businessId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Preview weekly review
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/founder/business-weekly-review"><ListChecks className="mr-2 h-4 w-4" /> View weekly outputs & history</Link>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM} />
          <Button onClick={() => run.mutate()} disabled={run.isPending || phrase !== CONFIRM || !businessId}>
            <PlayCircle className="mr-2 h-4 w-4" /> Run weekly review
          </Button>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.status}</Badge>
              <Badge variant="outline">Provider: {result.provider_status}</Badge>
              <Badge variant="outline">Overall: {sc.score_overall ?? 0}</Badge>
              <Badge variant="outline">Readiness: {sc.score_readiness ?? 0}</Badge>
              <Badge variant="outline">Knowledge: {sc.score_knowledge ?? 0}</Badge>
              <Badge variant="outline">Content: {sc.score_content ?? 0}</Badge>
              <Badge variant="outline">Customer: {sc.score_customer ?? 0}</Badge>
              <Badge variant="outline">Revenue: {sc.score_revenue ?? 0}</Badge>
              <Badge variant="outline">Operations: {sc.score_operations ?? 0}</Badge>
              <Badge variant={result.internal_ready ? "default" : "outline"}>Internal ready: {String(result.internal_ready)}</Badge>
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External: false</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Daily runs: {result.daily_runs_reviewed ?? 0}</Badge>
              <Badge variant="outline">Actions: {result.daily_actions_reviewed ?? 0}</Badge>
              <Badge variant="outline">Outputs reviewed: {result.outputs_reviewed ?? 0}</Badge>
              <Badge variant="outline">Done: {result.completed_actions ?? 0}</Badge>
              <Badge variant="outline">Blocked: {result.blocked_actions ?? 0}</Badge>
              <Badge variant="outline">Parked: {result.parked_actions ?? 0}</Badge>
              <Badge variant="outline">Outputs: {result.outputs_created ?? result.outputs_preview?.length ?? 0}</Badge>
              <Badge variant="outline">Founder reviews: {result.founder_review_items_created ?? 0}</Badge>
            </div>
            {result.weekly_summary && (
              <div className="text-xs text-muted-foreground">{result.weekly_summary}</div>
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
            {Array.isArray(result.outputs_preview) && result.outputs_preview.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 font-medium">Planned outputs ({result.outputs_preview.length})</div>
                <ul className="space-y-1">
                  {result.outputs_preview.map((o: any, i: number) => (
                    <li key={i} className="rounded border border-border/40 px-2 py-1">
                      <div className="flex items-center justify-between">
                        <span>{o.title}</span>
                        <span className="flex gap-1">
                          <Badge variant="outline">{o.output_type}</Badge>
                          <Badge variant="outline">{o.priority}</Badge>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <div className="text-xs">
            <div className="mb-1 font-medium">Recent weekly reviews</div>
            <ul className="space-y-1">
              {recent.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{r.week_start} → {r.week_end}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{r.run_status}</Badge>
                    <Badge variant="outline">overall:{r.score_overall}</Badge>
                    <Badge variant="outline">readiness:{r.score_readiness}</Badge>
                    {r.is_test_data && <Badge variant="outline">test</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Weekly internal learning loop only. No sends, no publish, no Apollo, no Smartlead, no payments, no portal invites. External go-live remains LOCKED_BY_DESIGN.
        </div>
      </CardContent>
    </Card>
  );
}