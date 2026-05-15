import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock, Download, ShieldCheck, Lock } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

type Business = { id: string; name: string };
type Draft = { id: string; platform_key: string; post_date: string | null; approval_status: string; hook: string | null; caption: string | null };

export default function SocialSchedulerExportPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [approvedDrafts, setApprovedDrafts] = useState<Draft[]>([]);
  const [batchName, setBatchName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [gateEnabled, setGateEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
    (supabase as any).from("external_action_gates").select("enabled").eq("gate_key", "metricool_schedule_post_gate").maybeSingle()
      .then(({ data }: any) => setGateEnabled(data?.enabled ?? false));
  }, []);

  useEffect(() => {
    (supabase as any).from("social_post_drafts")
      .select("id,platform_key,post_date,approval_status,hook,caption")
      .eq("business_id", businessId)
      .in("approval_status", ["approved", "founder_confirmed"])
      .order("post_date", { ascending: true })
      .limit(100)
      .then(({ data }: any) => setApprovedDrafts((data ?? []) as Draft[]));
  }, [businessId, result]);

  const run = async (live: boolean) => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("social-scheduling-export", {
        body: {
          business_id: businessId,
          batch_name: batchName.trim() || undefined,
          dry_run: !live,
          confirmation: live ? confirmation : "",
        },
      });
      if (err) throw err;
      setResult(data);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const downloadCsv = () => {
    if (!result?.csv) return;
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(batchName || "metricool-export").replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCsv = async () => {
    if (!result?.csv) return;
    await navigator.clipboard.writeText(result.csv);
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" /> Social Scheduler / Metricool Export Bridge
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Turn approved social drafts into a CSV / scheduling pack for Metricool. <Badge variant="outline" className="ml-1">No external posting</Badge>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Business</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Batch name</Label>
            <Input placeholder="e.g. Neon Candy — May Week 3" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Approved drafts ready for scheduling</div>
            <Badge variant="secondary">{approvedDrafts.length}</Badge>
          </div>
          {approvedDrafts.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No drafts in approved or founder_confirmed status yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground max-h-40 overflow-auto">
              {approvedDrafts.slice(0, 12).map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Badge variant="outline">{d.platform_key}</Badge>
                  <span>{d.post_date ?? "no date"}</span>
                  <span className="truncate">— {d.hook ?? d.caption ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(false)} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview export (dry-run)"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder='Type "CREATE METRICOOL EXPORT" to enable live'
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={() => run(true)} disabled={loading || confirmation !== "CREATE METRICOOL EXPORT"} size="sm" variant="destructive">
            Create export batch (internal records only)
          </Button>
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="h-3.5 w-3.5" /> Metricool API gate
            <Badge variant={gateEnabled ? "default" : "outline"}>
              {gateEnabled === null ? "loading…" : gateEnabled ? "enabled" : "disabled"}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Live posting to Metricool is disabled by default. Confirmation phrase to enable a future live push: <code>SCHEDULE METRICOOL POSTS</code>. Max batch size: 5.
          </p>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {result && (
          <div className="space-y-3">
            <div className="rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Mode: {result.mode} · Eligible: {result.eligible_posts} · Queue inserted: {result.queue_inserted ?? 0}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Platforms: {(result.platforms ?? []).join(", ") || "—"} · No external post · No Metricool API call
              </div>
              {result.csv && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="h-4 w-4 mr-1" /> Download CSV</Button>
                  <Button size="sm" variant="outline" onClick={copyCsv}>Copy CSV</Button>
                </div>
              )}
            </div>
            {result.preview?.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-card/60 text-left">
                    <tr>
                      <th className="p-2">Platform</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Caption</th>
                      <th className="p-2">CTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((r: any, i: number) => (
                      <tr key={i} className="border-t border-border/40">
                        <td className="p-2"><Badge variant="outline">{r.platform}</Badge></td>
                        <td className="p-2">{r.date ?? "—"}</td>
                        <td className="p-2">{r.time ?? "—"}</td>
                        <td className="p-2 max-w-md truncate">{r.caption}</td>
                        <td className="p-2 max-w-xs truncate">{r.cta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}