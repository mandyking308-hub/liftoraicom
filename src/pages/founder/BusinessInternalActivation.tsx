import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import BusinessInternalActivationPanel from "@/components/founder/activation/BusinessInternalActivationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export default function BusinessInternalActivationPage() {
  const [businessId, setBusinessId] = useState<string>("");

  const { data: businesses = [] } = useQuery({
    queryKey: ["bia-page-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: runbook = [] } = useQuery({
    queryKey: ["bia-runbook", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_operating_runbook_items")
        .select("id,item_type,cadence,title,priority,status,owner_agent,due_at")
        .eq("business_id", businessId)
        .order("cadence").order("priority", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["bia-actions", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_internal_daily_actions")
        .select("id,action_date,action_title,action_category,owner_agent,priority,status")
        .eq("business_id", businessId)
        .order("action_date").limit(200);
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["bia-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_internal_activation_records")
        .select("id,business_id,activation_status,activation_mode,readiness_score,internal_ready,external_ready,created_at")
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const summary = {
    total_businesses: businesses.length,
    internally_active: history.filter((h: any) => h.activation_status === "internally_active").length,
    blocked: history.filter((h: any) => h.activation_status === "blocked").length,
    external_ready: history.filter((h: any) => h.external_ready === true).length,
  };

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Business Internal Activation</h1>
        <p className="text-sm text-muted-foreground">
          Move an onboarded business into internal operating mode. Generates an operating runbook
          and a 7-day daily action plan. Nothing is sent. External go-live is{" "}
          <span className="font-medium">LOCKED_BY_DESIGN</span>.
        </p>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Multi-business summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Businesses: {summary.total_businesses}</Badge>
            <Badge variant="outline">Internally active: {summary.internally_active}</Badge>
            <Badge variant="outline">Blocked: {summary.blocked}</Badge>
            <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External ready: {summary.external_ready}</Badge>
          </CardContent>
        </Card>

        <BusinessInternalActivationPanel />

        <Card className="tech-card">
          <CardHeader><CardTitle>Browse a business</CardTitle></CardHeader>
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
              <div className="mb-2 text-sm font-medium">Operating runbook ({runbook.length})</div>
              <ul className="space-y-1 text-xs">
                {runbook.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                    <span>[{r.cadence}] {r.title}</span>
                    <span className="flex gap-1">
                      <Badge variant="outline">{r.priority}</Badge>
                      <Badge variant="outline">{r.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Daily actions ({actions.length})</div>
              <ul className="space-y-1 text-xs">
                {actions.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                    <span>{a.action_date} — {a.action_title}</span>
                    <span className="flex gap-1">
                      <Badge variant="outline">{a.action_category}</Badge>
                      <Badge variant="outline">{a.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>Activation history</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {history.map((h: any) => (
                <li key={h.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{new Date(h.created_at).toLocaleString()}</span>
                  <span className="flex gap-1">
                    <Badge variant="outline">{h.activation_status}</Badge>
                    <Badge variant="outline">{h.activation_mode}</Badge>
                    <Badge variant="outline">{h.readiness_score}/100</Badge>
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