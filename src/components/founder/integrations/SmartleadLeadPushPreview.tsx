import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, ShieldAlert } from "lucide-react";

export default function SmartleadLeadPushPreview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-lead-push-preview",
      { body: { limit: 25 } },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Lead Push Preview</h3>
          <Badge variant="outline" className="text-[10px]">dry-run</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? "Running…" : "Run dry-run preview"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Computes what Liftor would push if a Smartlead campaign existed. No Smartlead lead
        creation. No DB mutation. No emails sent.
      </p>
      {!data && <p className="text-[11px] text-muted-foreground">Click run to preview.</p>}
      {data && data.lead_push_ready === false && (
        <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-200 flex items-start gap-2">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5" />
          <div>
            <div className="font-semibold">Lead push not ready</div>
            <div>Blocker: {data.blocker ?? "unknown"}.</div>
            <div className="mt-1">{data.notes}</div>
          </div>
        </div>
      )}
      {data && data.lead_push_ready && (
        <>
          <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Eligible</div>
              <div className="font-mono text-sm">{data.eligible_count}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Excluded</div>
              <div className="font-mono text-sm">{data.excluded_count}</div>
            </div>
          </div>
          {data.excluded_reasons && (
            <div className="rounded border border-border/60 p-2 text-[11px]">
              <div className="font-medium mb-1">Exclusion reasons</div>
              {Object.entries(data.excluded_reasons).map(([k, v]) => (
                <div key={k} className="flex justify-between font-mono">
                  <span>{k}</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
          {data.preview?.[0] && (
            <pre className="rounded border border-border/60 bg-background/40 p-2 text-[10px] overflow-auto max-h-64">
              {JSON.stringify(data.preview[0], null, 2)}
            </pre>
          )}
        </>
      )}
      <p className="text-[10px] text-muted-foreground">No leads pushed — dry-run only.</p>
    </Card>
  );
}