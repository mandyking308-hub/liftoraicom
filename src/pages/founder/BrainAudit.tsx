import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BrainAudit() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("liftor_brain_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  const totals = rows.reduce((acc: any, r: any) => {
    for (const k of ["emails_sent","dms_sent","posts_published","apollo_calls","smartlead_posts","payment_mutations","portal_invites_sent","secrets_exposed","real_data_deleted"]) {
      acc[k] = (acc[k] ?? 0) + (Number(r[k] ?? 0) || 0);
    }
    return acc;
  }, {});

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Liftor Brain — Audit</h1>
          <Link to="/founder/brain"><Button variant="outline" size="sm">Back to Brain</Button></Link>
        </div>
        <Card className="tech-card">
          <CardHeader><CardTitle>No-forbidden-action totals (last {rows.length} events)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(totals).map(([k,v]: any) => (
                <Badge key={k} variant={Number(v) > 0 ? "destructive" : "outline"}>{k}: {String(v)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="border-b border-border/60 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.action}</span>
                      <Badge variant="outline">{r.action_status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · business {r.business_id ?? "—"} · session {r.session_id ?? "—"}
                    </div>
                    {r.error_message ? <div className="text-xs text-destructive mt-1">{r.error_message}</div> : null}
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