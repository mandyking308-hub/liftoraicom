import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RPLayout, RPSection, RPEmpty, NoExternalSharingBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { REPORT_STATUS_TONE, REPORT_ITEM_LABEL } from "@/lib/founderReportingEngine";

type Report = { id: string; report_type: string; period_start: string; period_end: string; report_status: string; executive_summary: string | null; key_metrics: any; key_risks: any; decisions_needed: any; recommended_actions: any };
type Item = { id: string; report_id: string; item_type: string; item_summary: string; metric_value: number | null; priority: string; action_required: boolean };

export default function ReportList({ title, subtitle, types }: { title: string; subtitle?: string; types: string[] | "archive" }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      let q = sb.from("founder_reports").select("*").order("period_end", { ascending: false });
      if (types === "archive") q = q.eq("report_status", "archived");
      else q = q.in("report_type", types).neq("report_status", "archived");
      const [rRes, iRes] = await Promise.all([
        q,
        sb.from("founder_report_items").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      setReports(rRes.data ?? []);
      setItems(iRes.data ?? []);
    })();
  }, [Array.isArray(types) ? types.join(",") : types]);

  return (
    <RPLayout title={title} subtitle={subtitle}>
      <NoExternalSharingBanner />
      <RPSection title={`Reports (${reports.length})`}>
        {reports.length === 0 ? <RPEmpty title="No reports yet" hint="The Founder Reporting Agent assembles drafts on schedule and on demand." /> : (
          <div className="space-y-3">
            {reports.map(r => {
              const reportItems = items.filter(i => i.report_id === r.id);
              const risks = Array.isArray(r.key_risks) ? r.key_risks : [];
              const decisions = Array.isArray(r.decisions_needed) ? r.decisions_needed : [];
              const actions = Array.isArray(r.recommended_actions) ? r.recommended_actions : [];
              return (
                <div key={r.id} className="rounded border border-border/50 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{r.report_type}</Badge>
                    <Badge variant="outline" className={`${REPORT_STATUS_TONE[r.report_status]} text-[10px]`}>{r.report_status}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                    </span>
                  </div>
                  {r.executive_summary && <p className="text-sm">{r.executive_summary}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    {risks.length > 0 && <div>• {risks.length} risk(s)</div>}
                    {decisions.length > 0 && <div>• {decisions.length} decision(s) needed</div>}
                    {actions.length > 0 && <div>• {actions.length} recommended action(s)</div>}
                  </div>
                  {reportItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      {Object.entries(groupBy(reportItems, i => i.item_type)).map(([t, list]) => (
                        <div key={t} className="rounded border border-border/40 p-2">
                          <p className="text-[10px] uppercase text-muted-foreground">{REPORT_ITEM_LABEL[t] ?? t}</p>
                          <p className="font-semibold">{list.length}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </RPSection>
    </RPLayout>
  );
}

function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  arr.forEach(x => { const k = key(x); (out[k] ??= []).push(x); });
  return out;
}