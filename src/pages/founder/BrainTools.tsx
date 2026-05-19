import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BrainTools() {
  const [tools, setTools] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("liftor_brain_tool_registry").select("*").order("tool_key"),
      supabase.from("liftor_brain_tool_calls").select("*").order("created_at", { ascending: false }).limit(50),
    ]).then(([a, b]) => {
      setTools(a.data ?? []);
      setCalls(b.data ?? []);
      setLoading(false);
    });
  }, []);

  const unsafeEnabled = tools.filter(t => t.external_action && t.tool_status !== "locked");

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Liftor Brain — Tools</h1>
          <Link to="/founder/brain"><Button variant="outline" size="sm">Back to Brain</Button></Link>
        </div>
        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Tool registry</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {unsafeEnabled.length === 0
                ? "✓ No unsafe external-action tools enabled."
                : `⚠ ${unsafeEnabled.length} unsafe tools detected.`}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <div className="space-y-1 text-sm">
                {tools.map(t => (
                  <div key={t.tool_key} className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="font-mono text-xs">{t.tool_key}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">{t.tool_category}</Badge>
                      <Badge variant="outline" className="text-xs">risk:{t.risk_level}</Badge>
                      {t.read_only ? <Badge variant="outline" className="text-xs">read</Badge> : null}
                      {t.internal_mutation_allowed ? <Badge variant="outline" className="text-xs">internal</Badge> : null}
                      {t.external_action ? <Badge variant="destructive" className="text-xs">external</Badge> : null}
                      <Badge variant={t.tool_status === "locked" ? "outline" : "secondary"} className="text-xs">{t.tool_status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader><CardTitle>Recent tool calls</CardTitle></CardHeader>
          <CardContent>
            {calls.length === 0 ? <p className="text-sm text-muted-foreground">No tool calls yet.</p> : (
              <div className="space-y-1 text-sm">
                {calls.map(c => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="font-mono text-xs">{c.tool_key}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">{c.status ?? c.call_status ?? "—"}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}