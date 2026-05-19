import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BrainDrafts() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("liftor_brain_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Liftor Brain — Internal Drafts</h1>
          <Link to="/founder/brain"><Button variant="outline" size="sm">Back to Brain</Button></Link>
        </div>
        <p className="text-xs text-muted-foreground">
          All drafts are internal. external_send_allowed is locked to false. external_action_blocked is true. No send button exists.
        </p>
        <Card className="tech-card">
          <CardHeader><CardTitle>Recent drafts</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts yet.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="border border-border/60 rounded p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.draft_type ?? "draft"} · {r.subject ?? r.title ?? "(no subject)"}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline">send {r.external_send_allowed ? "ALLOWED" : "locked"}</Badge>
                        <Badge variant="outline">blocked {r.external_action_blocked ? "yes" : "no"}</Badge>
                        <Badge variant="outline">{r.approval_status ?? "pending_review"}</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · business {r.business_id ?? "—"} · source {r.source_object_type ?? "—"}/{r.source_object_id ?? "—"}
                    </div>
                    {r.body_preview || r.body ? (
                      <pre className="whitespace-pre-wrap text-xs bg-muted/30 p-2 rounded max-h-40 overflow-auto">
                        {(r.body_preview ?? r.body ?? "").slice(0, 800)}
                      </pre>
                    ) : null}
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