import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Layers } from "lucide-react";

export default function BulkSendEngineBlueprint() {
  const [stages, setStages] = useState<Array<{ id: number; label: string; done: boolean }>>([]);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("provider-readiness-check", {
        body: {},
      });
      if (error) setErr(error.message);
      else {
        setStages(data.bulk_engine_stages ?? []);
        setAutoSend(!!data.auto_send_enabled);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <Card
      id="bulk-send-engine-blueprint"
      data-testid="bulk-send-engine-blueprint"
      className="p-5 space-y-4 border-2 border-border/60 scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Bulk Send Engine — Build Status</h3>
        <Badge variant="outline" className="text-[10px]">read-only blueprint</Badge>
      </div>
      <p className="text-xs text-muted-foreground max-w-2xl">
        Stages required before scale outbound sending can be turned on. Auto-send and cron
        remain disabled. No provider calls are made by this panel.
      </p>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {err && <p className="text-xs text-destructive">Error: {err}</p>}

      <ol className="space-y-1">
        {stages.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2 text-xs px-2 py-1 rounded border border-border/50 bg-background/40"
          >
            <span className="w-5 text-muted-foreground tabular-nums">{s.id}.</span>
            {s.done ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={s.done ? "text-emerald-200" : "text-foreground/90"}>{s.label}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {s.done ? "ready" : "pending"}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 text-[10px]">
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          IONOS proof configured
        </Badge>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
          External scale provider not configured
        </Badge>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
          Bulk send not active
        </Badge>
        <Badge
          variant="outline"
          className={
            autoSend
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }
        >
          Auto-send {autoSend ? "ENABLED" : "disabled"}
        </Badge>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          Cron disabled
        </Badge>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          No provider calls made
        </Badge>
      </div>
    </Card>
  );
}