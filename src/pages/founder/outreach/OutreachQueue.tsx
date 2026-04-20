import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Play } from "lucide-react";

type QueueItem = {
  id: string; contact_id: string; campaign_id: string; sequence_step: number;
  scheduled_at: string; status: "pending" | "sent" | "failed" | "blocked";
  inbox_id: string | null; business_name: string; block_reason: string; sent_at: string | null;
};

const STATUSES = ["ALL", "pending", "sent", "blocked", "failed"] as const;

const variant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "sent") return "default";
  if (s === "blocked" || s === "failed") return "destructive";
  if (s === "pending") return "outline";
  return "secondary";
};

const OutreachQueue = () => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<typeof STATUSES[number]>("ALL");
  const [running, setRunning] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    let q = supabase.from("email_queue").select("*").order("scheduled_at", { ascending: false }).limit(200);
    if (filter !== "ALL") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as QueueItem[]) ?? []);
  }
  useEffect(() => { void load(); }, [filter]);

  async function runWorker() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("outreach-send-worker", { body: {} });
      if (error) throw error;
      toast.success(`Processed ${data?.processed ?? 0} · sent ${data?.sent ?? 0} · blocked ${data?.blocked ?? 0}`);
      void load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setRunning(false); }
  }

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Email Queue</h1>
            <p className="text-sm text-muted-foreground">Send window: 08:00–17:00 UTC. Sanity layer blocks ineligible contacts.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof STATUSES[number])}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
            <Button size="sm" onClick={runWorker} disabled={running}><Play className="h-4 w-4 mr-2" />{running ? "Running…" : "Run worker now"}</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Queue Items ({items.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nothing here yet.</p> :
                items.map((i) => (
                  <div key={i.id} className="p-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs truncate">Step {i.sequence_step} · {i.business_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled {new Date(i.scheduled_at).toLocaleString()}
                        {i.sent_at && ` · Sent ${new Date(i.sent_at).toLocaleString()}`}
                      </p>
                      {i.block_reason && <p className="text-[11px] text-destructive mt-0.5">{i.block_reason}</p>}
                    </div>
                    <Badge variant={variant(i.status)}>{i.status}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default OutreachQueue;
