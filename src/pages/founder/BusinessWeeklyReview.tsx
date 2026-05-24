import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import BusinessWeeklyReviewPanel from "@/components/founder/activation/BusinessWeeklyReviewPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";

export default function BusinessWeeklyReviewPage() {
  const [businessId, setBusinessId] = useState<string>("");

  const { data: businesses = [] } = useQuery({
    queryKey: ["bwr-page-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ["bwr-outputs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_weekly_review_outputs")
        .select("id,output_type,output_status,title,summary,destination_module,priority,risk_level,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["bwr-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_weekly_review_runs")
        .select("id,business_id,week_start,week_end,run_status,score_overall,score_readiness,internal_ready,external_ready,recommendations_created,created_at")
        .order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: activations = [] } = useQuery({
    queryKey: ["bwr-activations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_internal_activation_records")
        .select("business_id,activation_status,internal_ready,external_ready")
        .eq("activation_status", "internally_active");
      return data ?? [];
    },
  });

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const reviewedThisWeek = new Set(history.filter((h: any) => h.week_end >= weekAgo).map((h: any) => h.business_id));
  const summary = {
    internally_active: activations.length,
    reviewed_this_week: reviewedThisWeek.size,
    not_reviewed_this_week: Math.max(0, activations.length - reviewedThisWeek.size),
    above_80: history.filter((h: any) => h.score_overall >= 80).length,
    below_80: history.filter((h: any) => h.score_overall < 80).length,
    external_ready: activations.filter((a: any) => a.external_ready === true).length,
  };

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Business Weekly Review / Learning Loop</h1>
        <p className="text-sm text-muted-foreground">
          Review the last 7 days of internal activity for each business. Generates a scorecard,
          repeated blockers, missing context, optimisation recommendations and a next-week plan.
          Nothing is sent or published. External go-live is{" "}
          <span className="font-medium">LOCKED_BY_DESIGN</span>.
        </p>

        <Card className="tech-card">
          <CardHeader><CardTitle>Multi-business weekly summary</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Internally active: {summary.internally_active}</Badge>
            <Badge variant="outline">Reviewed this week: {summary.reviewed_this_week}</Badge>
            <Badge variant="outline">Not reviewed: {summary.not_reviewed_this_week}</Badge>
            <Badge variant="outline">Score ≥ 80: {summary.above_80}</Badge>
            <Badge variant="outline">Score &lt; 80: {summary.below_80}</Badge>
            <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External ready: {summary.external_ready}</Badge>
          </CardContent>
        </Card>

        <BusinessWeeklyReviewPanel />

        <Card className="tech-card">
          <CardHeader><CardTitle>Browse weekly outputs</CardTitle></CardHeader>
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
              <div className="mb-2 text-sm font-medium">Weekly outputs ({outputs.length})</div>
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
          <CardHeader><CardTitle>Weekly review history</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {history.map((h: any) => (
                <li key={h.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{h.week_start} → {h.week_end} • {new Date(h.created_at).toLocaleString()}</span>
                  <span className="flex gap-1">
                    <Badge variant="outline">{h.run_status}</Badge>
                    <Badge variant="outline">overall:{h.score_overall}</Badge>
                    <Badge variant="outline">readiness:{h.score_readiness}</Badge>
                    <Badge variant="outline">recs:{h.recommendations_created}</Badge>
                    {h.external_ready && <Badge variant="destructive">external!</Badge>}
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