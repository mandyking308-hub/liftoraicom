import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function WorkerHelpAudit() {
  const [requests, setRequests] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<"all" | "unresolved" | "escalated">("all");

  const reload = async () => {
    const { data: r } = await (supabase as any).from("worker_help_requests").select("*").order("created_at", { ascending: false }).limit(200);
    setRequests(r ?? []);
    const { data: w } = await (supabase as any).from("worker_profiles").select("id, full_name, role");
    const map: Record<string, any> = {};
    (w ?? []).forEach((x: any) => { map[x.id] = x; });
    setWorkers(map);
  };
  useEffect(() => { reload(); }, []);

  const filtered = requests.filter((r) => filter === "all" || (filter === "unresolved" && r.status === "unresolved") || (filter === "escalated" && r.escalated_to_founder));

  const escalate = async (id: string) => {
    await (supabase as any).from("worker_help_requests").update({ escalated_to_founder: true, status: "escalated" }).eq("id", id);
    reload();
  };

  return (
    <FounderLayout>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Worker Help Audit</h1>
            <p className="text-sm text-muted-foreground">Every "Ask Liftor Help" question, answer and source manual section.</p>
          </div>
          <div className="flex gap-2 text-xs">
            {(["all", "unresolved", "escalated"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
        </header>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">No help requests yet.</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const w = workers[r.worker_id];
              return (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span>{w?.full_name ?? r.worker_id?.slice(0, 8)} · {w?.role ?? "—"}</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm"><span className="text-muted-foreground">Q:</span> {r.question}</div>
                  <div className="text-sm whitespace-pre-wrap p-3 bg-secondary/40 rounded-lg">{r.answer ?? "(no answer)"}</div>
                  <div className="flex flex-wrap gap-2 items-center justify-between text-xs">
                    <div className="flex gap-1">
                      <Badge variant="outline">{r.status}</Badge>
                      {r.escalated_to_founder && <Badge variant="outline" className="bg-amber-500/15 text-amber-300">escalated</Badge>}
                      <Badge variant="outline">{(r.source_manual_sections ?? []).length} source sections</Badge>
                    </div>
                    {!r.escalated_to_founder && r.status === "unresolved" && (
                      <Button size="sm" variant="outline" onClick={() => escalate(r.id)}>Mark escalated</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </FounderLayout>
  );
}