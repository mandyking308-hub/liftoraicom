import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import ControlledExternalActivationReadinessPanel from "@/components/founder/activation/ControlledExternalActivationReadinessPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";

export default function ExternalActivationReadinessPage() {
  const [businessId, setBusinessId] = useState<string>("");

  const { data: businesses = [] } = useQuery({
    queryKey: ["bear-page-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: checks = [] } = useQuery({
    queryKey: ["bear-checks", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_external_activation_channel_checks")
        .select("id,channel_key,channel_name,channel_status,gate_key,gate_enabled,secret_present,recommended_first_batch_size,next_safe_action,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["bear-plans", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_external_activation_plans")
        .select("id,plan_status,plan_title,plan_summary,max_first_batch,external_activation_allowed,external_action_blocked,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["bear-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_external_activation_readiness_runs")
        .select("id,business_id,run_status,readiness_score,recommended_mode,channels_ready,channels_blocked,channels_warning,external_ready,external_activation_allowed,all_external_gates_locked,created_at")
        .order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const summary = {
    total: businesses.length,
    with_plan: new Set(plans.map((p: any) => p.id)).size,
    blocked: history.filter((h: any) => h.recommended_mode === "blocked").length,
    ready_for_review: history.filter((h: any) => h.recommended_mode === "ready_for_founder_review").length,
    micro_batch_later: history.filter((h: any) => h.recommended_mode === "ready_for_controlled_micro_batch_later").length,
    external_activation_allowed: history.filter((h: any) => h.external_activation_allowed === true).length,
    gates_unlocked: history.filter((h: any) => h.all_external_gates_locked === false).length,
  };

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Controlled External Activation Readiness</h1>
        <p className="text-sm text-muted-foreground">
          Check whether each business is ready for a future controlled, micro-batch external activation —
          channel by channel. Nothing is sent, scheduled, charged or invited. External go-live is{" "}
          <span className="font-medium">LOCKED_BY_DESIGN</span>.
        </p>

        <Card className="tech-card">
          <CardHeader><CardTitle>Multi-business readiness summary</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Businesses: {summary.total}</Badge>
            <Badge variant="outline">Blocked: {summary.blocked}</Badge>
            <Badge variant="outline">Ready for review: {summary.ready_for_review}</Badge>
            <Badge variant="outline">Micro-batch later: {summary.micro_batch_later}</Badge>
            <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External activation allowed: {summary.external_activation_allowed}</Badge>
            <Badge variant={summary.gates_unlocked > 0 ? "destructive" : "outline"}>Runs with unlocked gates: {summary.gates_unlocked}</Badge>
          </CardContent>
        </Card>

        <ControlledExternalActivationReadinessPanel />

        <Card className="tech-card">
          <CardHeader><CardTitle>Channel checks</CardTitle></CardHeader>
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
            <div>
              <div className="mb-2 text-sm font-medium">Channel checks ({checks.length})</div>
              <ul className="space-y-1 text-xs">
                {checks.map((c: any) => (
                  <li key={c.id} className="rounded border border-border/40 px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span>{c.channel_name}</span>
                      <span className="flex gap-1">
                        <Badge variant={c.channel_status === "ready_for_founder_review" ? "default" : c.channel_status === "blocked" ? "destructive" : "outline"}>{c.channel_status}</Badge>
                        <Badge variant="outline">batch≤{c.recommended_first_batch_size}</Badge>
                        {c.gate_enabled && <Badge variant="destructive">gate enabled!</Badge>}
                      </span>
                    </div>
                    {c.next_safe_action && <div className="mt-1 text-muted-foreground">{c.next_safe_action}</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Activation plans ({plans.length})</div>
              <ul className="space-y-1 text-xs">
                {plans.map((p: any) => (
                  <li key={p.id} className="rounded border border-border/40 px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span>{p.plan_title}</span>
                      <span className="flex gap-1">
                        <Badge variant="outline">{p.plan_status}</Badge>
                        <Badge variant="outline">first batch ≤ {p.max_first_batch}</Badge>
                        {p.external_activation_allowed && <Badge variant="destructive">ext!</Badge>}
                      </span>
                    </div>
                    {p.plan_summary && <div className="mt-1 text-muted-foreground">{p.plan_summary}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>Readiness run history</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {history.map((h: any) => (
                <li key={h.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{new Date(h.created_at).toLocaleString()}</span>
                  <span className="flex gap-1">
                    <Badge variant="outline">{h.run_status}</Badge>
                    <Badge variant="outline">{h.recommended_mode}</Badge>
                    <Badge variant="outline">score:{h.readiness_score}</Badge>
                    <Badge variant="outline">ready:{h.channels_ready}</Badge>
                    <Badge variant="outline">warn:{h.channels_warning}</Badge>
                    <Badge variant="outline">blocked:{h.channels_blocked}</Badge>
                    {(h.external_activation_allowed || !h.all_external_gates_locked) && <Badge variant="destructive">UNSAFE</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}