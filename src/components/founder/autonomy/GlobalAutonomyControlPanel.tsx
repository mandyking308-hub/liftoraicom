import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldCheck, Layers, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GlobalAutonomyControlPanel() {
  const { data: levels } = useQuery({
    queryKey: ["autonomy_levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autonomy_levels")
        .select("*")
        .order("level_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["autonomy_policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autonomy_policies")
        .select("*")
        .order("action_type");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["autonomy_audit_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autonomy_action_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const blockedExternal = useMemo(
    () =>
      (policies ?? []).filter((p: any) =>
        ["native_email_send", "smartlead_lead_push", "apollo_reveal", "campaign_start", "invoice_send"].includes(p.action_type),
      ),
    [policies],
  );

  const [test, setTest] = useState({
    action_type: "native_email_send",
    business_id: "",
    agent_key: "",
    channel_key: "",
    jurisdiction_code: "",
    language_code: "",
    risk_level: "medium",
    batch_size: 1,
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  async function runTest() {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("autonomy-policy-evaluate", {
        body: {
          ...test,
          business_id: test.business_id || null,
          agent_key: test.agent_key || null,
          channel_key: test.channel_key || null,
          jurisdiction_code: test.jurisdiction_code || null,
          language_code: test.language_code || null,
          batch_size: Number(test.batch_size) || 1,
        },
      });
      if (error) throw error;
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ error: e?.message ?? String(e) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck size={14} className="text-primary" />
          Global Autonomy Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] flex items-start gap-2">
          <AlertTriangle size={12} className="text-destructive mt-0.5" />
          <span>
            <strong>Level 5 (Full Autopilot)</strong> is never the global default. External sends, provider mutations, credit spend and money movement remain gated until policy and explicit gates are enabled.
          </span>
        </div>

        <section>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Layers size={12} /> Autonomy levels
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(levels ?? []).map((l: any) => (
              <div key={l.id} className="p-2 rounded-md border border-border/40 bg-secondary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">L{l.level_number} · {l.level_label}</span>
                  <Badge variant="outline" className="text-[9px]">{l.max_risk_level}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{l.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {l.internal_record_creation_allowed && <Badge variant="secondary" className="text-[9px]">internal</Badge>}
                  {l.ai_draft_creation_allowed && <Badge variant="secondary" className="text-[9px]">drafts</Badge>}
                  {l.external_send_allowed && <Badge className="text-[9px] bg-amber-500/20 text-amber-300">send</Badge>}
                  {l.provider_mutation_allowed && <Badge className="text-[9px] bg-amber-500/20 text-amber-300">provider</Badge>}
                  {l.credit_spend_allowed && <Badge className="text-[9px] bg-amber-500/20 text-amber-300">credits</Badge>}
                  {l.money_movement_allowed && <Badge className="text-[9px] bg-destructive/30">money</Badge>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold mb-2">Default policies by action type</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-muted-foreground">
                <tr><th className="text-left p-1">Action</th><th>Level</th><th>Approval</th><th>Risk</th><th>Scope</th></tr>
              </thead>
              <tbody>
                {(policies ?? []).map((p: any) => (
                  <tr key={p.id} className="border-t border-border/30">
                    <td className="p-1 font-mono text-[10px]">{p.action_type}</td>
                    <td className="text-center">L{p.autonomy_level}</td>
                    <td className="text-center">{p.requires_founder_approval ? "yes" : "no"}</td>
                    <td className="text-center">{p.risk_level}</td>
                    <td className="text-center text-muted-foreground">
                      {p.business_id ? "biz" : "global"}
                      {p.agent_key ? ` · ${p.agent_key}` : ""}
                      {p.channel_key ? ` · ${p.channel_key}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold mb-2">Blocked external actions (gated)</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {blockedExternal.map((p: any) => (
              <div key={p.id} className="p-2 rounded-md border border-amber-500/30 bg-amber-500/5">
                <div className="text-[11px] font-mono">{p.action_type}</div>
                <div className="text-[10px] text-muted-foreground">L{p.autonomy_level} · approval required · gate disabled</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border/40 bg-secondary/20 p-2">
          <h3 className="text-xs font-semibold mb-2">Policy evaluator (test)</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            {(["action_type", "business_id", "agent_key", "channel_key", "jurisdiction_code", "language_code", "risk_level", "batch_size"] as const).map((k) => (
              <div key={k}>
                <Label className="text-[10px]">{k}</Label>
                <Input
                  className="h-7 text-[11px]"
                  value={(test as any)[k] ?? ""}
                  onChange={(e) => setTest({ ...test, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" onClick={runTest} disabled={testing}>
            {testing ? "Evaluating…" : "Evaluate policy"}
          </Button>
          {testResult && (
            <pre className="mt-2 text-[10px] bg-background/60 border border-border/40 rounded p-2 overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Activity size={12} /> Recent autonomy audit
          </h3>
          <div className="space-y-1">
            {(audit ?? []).map((a: any) => (
              <div key={a.id} className="text-[10px] flex items-center justify-between border-b border-border/20 py-1">
                <span className="font-mono">{a.action_type}</span>
                <span>L{a.resolved_autonomy_level ?? "?"}</span>
                <Badge variant={a.allowed ? "secondary" : "outline"} className="text-[9px]">
                  {a.allowed ? "allowed" : "blocked"}
                </Badge>
                <span className="text-muted-foreground">{formatDistanceToNow(new Date(a.created_at))} ago</span>
              </div>
            ))}
            {(audit ?? []).length === 0 && (
              <p className="text-[10px] text-muted-foreground">No autonomy decisions audited yet.</p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}