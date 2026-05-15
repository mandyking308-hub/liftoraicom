import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Globe2, Scale, AlertTriangle, ListChecks } from "lucide-react";

const ACTION_TYPES = [
  "cold_b2b_email","warm_customer_email","proposal_send","invoice_send",
  "marketing_followup","unsubscribe_processing","data_retention",
  "ai_generated_reply","multilingual_reply","donor_outreach",
  "property_investment_message","health_related_message","education_child_related_message",
];

function riskColor(r: string) {
  if (r === "critical") return "destructive";
  if (r === "high") return "destructive";
  if (r === "medium") return "secondary";
  return "outline";
}

export default function GlobalJurisdictionPolicyPanel() {
  const [jurisdiction, setJurisdiction] = useState("UK");
  const [actionType, setActionType] = useState("cold_b2b_email");
  const [channel, setChannel] = useState("email");
  const [contactType, setContactType] = useState("b2b");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: policies } = useQuery({
    queryKey: ["jurisdiction_policy_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_policy_profiles")
        .select("*")
        .order("jurisdiction_code")
        .order("action_type");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: queue } = useQuery({
    queryKey: ["jurisdiction_review_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_review_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const highRisk = (policies ?? []).filter((p: any) => ["high", "critical"].includes(p.risk_level));
  const unknownBlocked = (policies ?? []).filter((p: any) => p.jurisdiction_code === "XX" && !p.allowed);

  async function runCheck() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("jurisdiction-action-check", {
        body: {
          jurisdiction_code: jurisdiction,
          action_type: actionType,
          channel_key: channel,
          contact_type: contactType,
        },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      setResult({ error: String(e?.message ?? e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            Global Jurisdiction Policy Engine
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Operational compliance guidance only — not legal advice. All external actions require founder approval.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Jurisdiction</Label>
              <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Contact type</Label>
              <Input value={contactType} onChange={(e) => setContactType(e.target.value)} />
            </div>
          </div>
          <Button onClick={runCheck} disabled={loading} size="sm">
            <ShieldAlert className="h-4 w-4 mr-2" />
            {loading ? "Checking…" : "Run jurisdiction check"}
          </Button>
          {result && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
              {result.error ? (
                <p className="text-destructive">{result.error}</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={result.allowed ? "default" : "destructive"}>
                      {result.allowed ? "Allowed" : "Blocked"}
                    </Badge>
                    <Badge variant={riskColor(result.risk_level) as any}>risk: {result.risk_level}</Badge>
                    {result.founder_review_required && <Badge variant="secondary">founder review</Badge>}
                    {result.legal_review_recommended && <Badge variant="outline">legal review recommended</Badge>}
                    {result.fallback_policy_used && <Badge variant="destructive">fallback policy</Badge>}
                  </div>
                  {result.blockers?.length > 0 && (
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {result.blockers.map((b: string, i: number) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                  <p className="text-muted-foreground italic">{result.notes}</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Jurisdiction policies ({policies?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {(policies ?? []).map((p: any) => (
              <div key={p.id} className="rounded border p-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.jurisdiction_name}</span>
                  <Badge variant={riskColor(p.risk_level) as any}>{p.risk_level}</Badge>
                </div>
                <div className="text-muted-foreground">{p.action_type}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant={p.allowed ? "default" : "destructive"}>
                    {p.allowed ? "allowed" : "blocked"}
                  </Badge>
                  {p.founder_review_required && <Badge variant="secondary">founder</Badge>}
                  {p.legal_review_recommended && <Badge variant="outline">legal</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> High-risk areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {highRisk.length === 0 && <p className="text-xs text-muted-foreground">No high-risk policies.</p>}
            {highRisk.map((p: any) => (
              <div key={p.id} className="rounded border p-2 text-xs">
                <span className="font-medium">{p.jurisdiction_code}</span> · {p.action_type}
                <Badge variant={riskColor(p.risk_level) as any} className="ml-2">{p.risk_level}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" /> Unknown jurisdiction blockers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {unknownBlocked.map((p: any) => (
              <div key={p.id} className="rounded border p-2 text-xs">
                {p.action_type} <Badge variant="destructive" className="ml-2">blocked</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Review queue ({queue?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {(queue ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Queue is empty.</p>
            )}
            {(queue ?? []).map((q: any) => (
              <div key={q.id} className="rounded border p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{q.action_type}</span>
                  <Badge variant={riskColor(q.risk_level) as any}>{q.risk_level}</Badge>
                </div>
                <div className="text-muted-foreground">{q.review_reason}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}