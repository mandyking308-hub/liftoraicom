import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import BusinessDailyOperatingLoopPanel from "@/components/founder/activation/BusinessDailyOperatingLoopPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";

export default function BusinessDailyOperatingLoopPage() {
  const [businessId, setBusinessId] = useState<string>("");

  const { data: businesses = [] } = useQuery({
    queryKey: ["bdol-page-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const { data: outputs = [] } = useQuery({
    queryKey: ["bdol-outputs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_daily_operating_outputs")
        .select("id,output_type,output_status,title,summary,destination_module,priority,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["bdol-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_daily_operating_runs")
        .select("id,business_id,run_date,run_status,actions_loaded,actions_completed,actions_blocked,actions_parked,outputs_created:recommendations_created,founder_review_items_created,created_at")
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: activations = [] } = useQuery({
    queryKey: ["bdol-activations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_internal_activation_records")
        .select("business_id,activation_status,internal_ready,external_ready")
        .eq("activation_status", "internally_active");
      return data ?? [];
    },
  });

  const summary = {
    internally_active: activations.length,
    with_today: history.filter((h: any) => h.run_date === today).length,
    completed_today: history.filter((h: any) => h.run_date === today && h.run_status === "completed").length,
    blocked_today: history.filter((h: any) => h.run_date === today && h.run_status === "blocked").length,
    external_ready: activations.filter((a: any) => a.external_ready === true).length,
  };

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Business Daily Operating Loop</h1>
        <p className="text-sm text-muted-foreground">
          Run the internal daily operating cycle for any internally activated business. Generates
          summaries, recommendations and draft reviews. Nothing is sent. External go-live is{" "}
          <span className="font-medium">LOCKED_BY_DESIGN</span>.
        </p>

        <Card className="tech-card">
          <CardHeader><CardTitle>Multi-business daily summary</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Internally active: {summary.internally_active}</Badge>
            <Badge variant="outline">With today's loop: {summary.with_today}</Badge>
            <Badge variant="outline">Completed today: {summary.completed_today}</Badge>
            <Badge variant="outline">Blocked today: {summary.blocked_today}</Badge>
            <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External ready: {summary.external_ready}</Badge>
          </CardContent>
        </Card>

        <BusinessDailyOperatingLoopPanel />

        <Card className="tech-card">
          <CardHeader><CardTitle>Browse outputs</CardTitle></CardHeader>
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
              <div className="mb-2 text-sm font-medium">Daily outputs ({outputs.length})</div>
              <ul className="space-y-1 text-xs">
                {outputs.map((o: any) => (
                  <li key={o.id} className="rounded border border-border/40 px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span>{o.title}</span>
                      <span className="flex gap-1">
                        <Badge variant="outline">{o.output_type}</Badge>
                        <Badge variant="outline">{o.output_status}</Badge>
                        <Badge variant="outline">{o.priority}</Badge>
                      </span>
                    </div>
                    {o.summary && <div className="mt-1 text-muted-foreground">{o.summary}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>Run history</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {history.map((h: any) => (
                <li key={h.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{h.run_date} • {new Date(h.created_at).toLocaleTimeString()}</span>
                  <span className="flex gap-1">
                    <Badge variant="outline">{h.run_status}</Badge>
                    <Badge variant="outline">a:{h.actions_loaded}</Badge>
                    <Badge variant="outline">d:{h.actions_completed}</Badge>
                    <Badge variant="outline">b:{h.actions_blocked}</Badge>
                    <Badge variant="outline">p:{h.actions_parked}</Badge>
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