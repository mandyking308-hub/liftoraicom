import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, Power, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CONFIRM = "ACTIVATE BUSINESS INTERNAL MODE";

export default function BusinessInternalActivationPanel() {
  const [businessId, setBusinessId] = useState<string>("");
  const [mode, setMode] = useState<string>("internal_only");
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["bia-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["bia-recent", businessId],
    queryFn: async () => {
      let q = supabase
        .from("business_internal_activation_records")
        .select("id,business_id,activation_status,activation_mode,readiness_score,internal_ready,external_ready,created_at,is_test_data")
        .order("created_at", { ascending: false }).limit(10);
      if (businessId) q = q.eq("business_id", businessId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const body = useMemo(() => ({
    business_id: businessId || undefined,
    activation_mode: mode,
  }), [businessId, mode]);

  const preview = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      const { data, error } = await supabase.functions.invoke("business-internal-activate", {
        body: { ...body, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Preview: readiness ${d.readiness_score ?? 0}/100`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const activate = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Select a business first");
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-internal-activate", {
        body: { ...body, dry_run: false, confirmation_phrase: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Internal activation: ${d.activation_status}`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power className="h-5 w-5" />
          Business Internal Activation
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
          <div>
            <Label>Activation mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">sandbox</SelectItem>
                <SelectItem value="internal_only">internal_only</SelectItem>
                <SelectItem value="founder_review">founder_review</SelectItem>
                <SelectItem value="limited_external_locked">limited_external_locked</SelectItem>
                <SelectItem value="paused">paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => preview.mutate()} disabled={preview.isPending || !businessId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Preview internal activation
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/founder/business-internal-activation"><ListChecks className="mr-2 h-4 w-4" /> View runbook & daily actions</Link>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM} />
          <Button onClick={() => activate.mutate()} disabled={activate.isPending || phrase !== CONFIRM || !businessId}>
            <Power className="mr-2 h-4 w-4" /> Activate internal mode
          </Button>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.activation_status ?? result.status}</Badge>
              <Badge variant="outline">Mode: {result.activation_mode}</Badge>
              <Badge variant="outline">Readiness: {result.readiness_score}/100</Badge>
              <Badge variant={result.internal_ready ? "default" : "outline"}>Internal ready: {String(result.internal_ready)}</Badge>
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External: false</Badge>
              <Badge variant="outline">Runbook: {result.runbook_items ?? 0}</Badge>
              <Badge variant="outline">Daily actions: {result.daily_actions ?? 0}</Badge>
            </div>
            {(result.missing_context ?? []).length > 0 && (
              <div className="flex items-start gap-2 text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">Missing context</div>
                  <ul className="list-disc pl-5">
                    {result.missing_context.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {(result.blockers ?? []).length > 0 && (
              <div className="text-xs text-destructive">Blockers: {result.blockers.join("; ")}</div>
            )}
            {(result.risk_warnings ?? []).length > 0 && (
              <div className="text-xs text-muted-foreground">Risks: {result.risk_warnings.join("; ")}</div>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <div className="text-xs">
            <div className="mb-1 font-medium">Recent activation records</div>
            <ul className="space-y-1">
              {recent.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{r.activation_status}</Badge>
                    <Badge variant="outline">{r.activation_mode}</Badge>
                    <Badge variant="outline">{r.readiness_score}/100</Badge>
                    {r.is_test_data && <Badge variant="outline">test</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Internal operating mode only. No sends, no publish, no Apollo, no Smartlead, no payments, no portal invites. External go-live remains LOCKED_BY_DESIGN.
        </div>
      </CardContent>
    </Card>
  );
}