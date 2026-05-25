import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RPLayout, RPSection, RPEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { REPORT_ITEM_LABEL } from "@/lib/founderReportingEngine";

type Item = { id: string; report_id: string; item_type: string; item_summary: string; metric_value: number | null; priority: string; action_required: boolean; created_at: string };

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border/50",
};

export default function ReportsDecisions() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("founder_report_items").select("*").eq("action_required", true).order("created_at", { ascending: false }).limit(200);
      setItems(data ?? []);
    })();
  }, []);

  const decisions = items.filter(i => i.item_type === "decision");
  const others = items.filter(i => i.item_type !== "decision");

  return (
    <RPLayout title="Decisions needed" subtitle="Items flagged action_required by the Founder Reporting Agent — scale, keep, watch, pause, retire, escalate or invest decisions waiting on the founder.">
      <RPSection title={`Open decisions (${decisions.length})`}>
        {decisions.length === 0 ? <RPEmpty title="No decisions needed" /> : <ItemList items={decisions} />}
      </RPSection>
      <RPSection title={`Other action-required items (${others.length})`}>
        {others.length === 0 ? <RPEmpty title="No other action items" /> : <ItemList items={others} />}
      </RPSection>
    </RPLayout>
  );
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="space-y-2">
      {items.map(i => (
        <div key={i.id} className="rounded border border-border/50 p-3 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[10px]">{REPORT_ITEM_LABEL[i.item_type] ?? i.item_type}</Badge>
            <Badge variant="outline" className={`${PRIORITY_TONE[i.priority] ?? PRIORITY_TONE.medium} text-[10px]`}>{i.priority}</Badge>
            <span className="text-muted-foreground ml-auto">{new Date(i.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm">{i.item_summary}</p>
          {i.metric_value != null && <p className="text-[11px] text-muted-foreground">Metric: {Number(i.metric_value).toLocaleString()}</p>}
        </div>
      ))}
    </div>
  );
}