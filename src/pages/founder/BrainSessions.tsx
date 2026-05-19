import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BrainSessions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("liftor_brain_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Liftor Brain — Sessions</h1>
          <Link to="/founder/brain"><Button variant="outline" size="sm">Back to Brain</Button></Link>
        </div>
        <Card className="tech-card">
          <CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.session_type ?? "session"} · {r.status ?? "open"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · business {r.business_id ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">model {r.model ?? "—"}</Badge>
                      <Badge variant={r.external_actions_allowed ? "destructive" : "outline"}>
                        external {r.external_actions_allowed ? "ALLOWED" : "locked"}
                      </Badge>
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