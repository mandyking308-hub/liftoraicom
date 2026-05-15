import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, AlertTriangle, ScanLine, Eye } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const fmt = (d: any) => d ? String(d).slice(0, 10) : '—';

export default function DataPrivacyRetentionPanel() {
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const { data: requests, refetch: refetchReq } = useQuery({
    queryKey: ["data_privacy_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_privacy_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: inventory, refetch: refetchInv } = useQuery({
    queryKey: ["customer_data_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_data_inventory").select("*").order("last_scanned_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const r = requests ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const open = r.filter((x: any) => !['completed', 'rejected', 'closed'].includes(x.request_status));
    return {
      total: r.length,
      open: open.length,
      overdue: r.filter((x: any) => x.due_date && x.due_date < today && !['completed','rejected','closed'].includes(x.request_status)).length,
      due_30d: r.filter((x: any) => x.due_date && x.due_date >= today).length,
      deletion: r.filter((x: any) => x.request_type === 'deletion' && !['completed','rejected'].includes(x.request_status)).length,
      export: r.filter((x: any) => x.request_type === 'data_export' && !['completed','rejected'].includes(x.request_status)).length,
      legal_review: r.filter((x: any) => x.legal_review_recommended && x.request_status !== 'completed').length,
      retention_due: (inventory ?? []).filter((i: any) => i.retention_until && i.retention_until <= today).length,
      sensitive_areas: (inventory ?? []).filter((i: any) => i.contains_sensitive_data).length,
      inventory_areas: (inventory ?? []).length,
    };
  }, [requests, inventory]);

  const scan = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("privacy-data-inventory-scan", { body: {} });
      if (error) throw error;
      toast.success(`Inventory scanned · ${data?.areas_scanned ?? 0} areas · ${data?.total_records_indexed ?? 0} records`);
      await Promise.all([refetchInv(), refetchReq()]);
    } catch (e: any) { toast.error(e.message ?? "Scan failed"); }
    finally { setBusy(false); }
  };

  const previewRequest = async (id: string) => {
    setPreviewing(id);
    try {
      const { data, error } = await supabase.functions.invoke("privacy-request-preview", { body: { privacy_request_id: id } });
      if (error) throw error;
      setPreview(data);
      toast.success("Preview generated · no data was deleted or exported");
    } catch (e: any) { toast.error(e.message ?? "Preview failed"); }
    finally { setPreviewing(null); }
  };

  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? 0}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-data-privacy-retention">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> Data Privacy · Retention · DSAR Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-delete · No auto-export · No external send · Founder approval required</Badge>
            <Button size="sm" variant="outline" onClick={scan} disabled={busy}><ScanLine size={12} className="mr-1" />{busy ? 'Scanning…' : 'Scan inventory'}</Button>
            <Button size="sm" variant="outline" onClick={() => { refetchReq(); refetchInv(); }}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Tile label="Open requests" value={summary.open} tone={summary.open ? 'text-yellow-300' : ''} />
          <Tile label="Overdue DSAR" value={summary.overdue} tone={summary.overdue ? 'text-destructive' : ''} />
          <Tile label="Deletion pending" value={summary.deletion} tone={summary.deletion ? 'text-yellow-300' : ''} />
          <Tile label="Export pending" value={summary.export} tone={summary.export ? 'text-yellow-300' : ''} />
          <Tile label="Legal review" value={summary.legal_review} tone={summary.legal_review ? 'text-yellow-300' : ''} />
          <Tile label="Inventory areas" value={summary.inventory_areas} />
          <Tile label="Sensitive areas" value={summary.sensitive_areas} tone={summary.sensitive_areas ? 'text-yellow-300' : ''} />
          <Tile label="Retention reviews due" value={summary.retention_due} tone={summary.retention_due ? 'text-yellow-300' : ''} />
          <Tile label="Total requests" value={summary.total} />
          <Tile label="Due (any)" value={summary.due_30d} />
        </div>

        <div className="text-[11px] text-muted-foreground italic flex items-start gap-1">
          <AlertTriangle size={11} className="mt-0.5" />
          Tracking only. No customer data is deleted, anonymised or exported automatically. Every privacy action requires founder approval and, where applicable, legal review.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Privacy requests</div>
            {(requests ?? []).length === 0 ? (
              <div className="text-[11px] text-muted-foreground">No privacy requests recorded yet.</div>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-auto text-[11px]">
                {(requests ?? []).map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between border-b border-border/20 py-1 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant="outline" className="text-[9px]">{r.request_type}</Badge>
                      <Badge variant="outline" className="text-[9px]">{r.request_status}</Badge>
                      {r.legal_review_recommended && <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-300">legal review</Badge>}
                      <span className="truncate text-muted-foreground">{r.request_summary ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{fmt(r.due_date)}</span>
                      <Button size="sm" variant="ghost" disabled={previewing === r.id} onClick={() => previewRequest(r.id)}>
                        <Eye size={11} className="mr-1" />Preview
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Customer data inventory</div>
            {(inventory ?? []).length === 0 ? (
              <div className="text-[11px] text-muted-foreground">Run "Scan inventory" to map customer data areas.</div>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-auto text-[11px]">
                {(inventory ?? []).map((i: any) => (
                  <li key={i.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{i.data_area}</span>
                      <Badge variant="outline" className="text-[9px]">{i.source_table}</Badge>
                      {i.contains_sensitive_data && <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-300">sensitive</Badge>}
                      {i.lawful_basis && <span className="text-muted-foreground">· {i.lawful_basis}</span>}
                    </div>
                    <div className="text-muted-foreground">{i.record_count} rec · retain {fmt(i.retention_until)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {preview && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2 flex items-center justify-between">
              <span>Preview — request {String(preview?.request?.id ?? '').slice(0, 8)} · {preview?.request?.request_type}</span>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <Tile label="Planned action" value={preview.planned_action} />
              <Tile label="Records in scope" value={preview.total_records_in_scope} />
              <Tile label="Sensitive areas" value={preview.sensitive_areas} tone={preview.sensitive_areas ? 'text-yellow-300' : ''} />
              <Tile label="Legal review" value={preview.legal_review_needed ? 'Yes' : 'No'} tone={preview.legal_review_needed ? 'text-yellow-300' : ''} />
            </div>
            <div className="text-[11px] text-muted-foreground italic mb-2">{preview.disclaimer}</div>
            <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
              {(preview.affected_areas ?? []).map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{a.area}</span>
                    <Badge variant="outline" className="text-[9px]">{a.source_table}</Badge>
                    {a.sensitive && <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-300">sensitive</Badge>}
                  </span>
                  <span className="text-muted-foreground">{a.record_count} rec · {a.lawful_basis ?? '—'} · retain {fmt(a.retention_until)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}