import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const READINESS_TYPES = [
  "funding","lending","strategic_partner","partial_exit","full_sale",
  "acquisition_target","investor_update","board_pack",
] as const;

export default function FundingExitReadinessPanel() {
  const qc = useQueryClient();
  const [businessId, setBusinessId] = useState<string>("__all__");
  const [readinessType, setReadinessType] = useState<typeof READINESS_TYPES[number]>("funding");
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const { data: businesses } = useQuery({
    queryKey: ["funding-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: readiness } = useQuery({
    queryKey: ["funding-exit-readiness"],
    queryFn: async () => {
      const { data } = await supabase
        .from("funding_exit_readiness")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: targets } = useQuery({
    queryKey: ["investor-buyer-targets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_buyer_targets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = readiness ?? [];
    const dataRoomGaps = list.filter((r: any) => r.data_room_status !== "ready").length;
    const blockerCount = list.reduce((s: number, r: any) => s + ((r.blockers as any[])?.length ?? 0), 0);
    const avgScore = list.length ? Math.round(list.reduce((s: number, r: any) => s + Number(r.readiness_score ?? 0), 0) / list.length) : 0;
    return { total: list.length, dataRoomGaps, blockerCount, avgScore, targets: targets?.length ?? 0 };
  }, [readiness, targets]);

  const run = async (confirm?: string) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("exit-readiness-run", {
        body: {
          business_id: businessId === "__all__" ? null : businessId,
          readiness_type: readinessType,
          confirm,
        },
      });
      if (error) throw error;
      setPreview(data);
      if (confirm) {
        toast({ title: "Readiness review created", description: `${readinessType} · score ${data?.readiness_score ?? "n/a"}` });
        qc.invalidateQueries({ queryKey: ["funding-exit-readiness"] });
      }
    } catch (e: any) {
      toast({ title: "Readiness run failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="tech-card" id="sec-funding-exit-readiness">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Funding · M&amp;A · Exit Readiness</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Internal readiness scoring for investors, lenders, partners, acquirers. Drafts only — no outreach, no deck send, no data-room sharing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">No external outreach</Badge>
            <Badge variant="outline" className="text-xs">No data room sharing</Badge>
            <Badge variant="outline" className="text-xs">Founder approval required</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Reviews" value={stats.total} />
          <Stat label="Avg score" value={`${stats.avgScore}`} />
          <Stat label="Open blockers" value={stats.blockerCount} />
          <Stat label="Data-room gaps" value={stats.dataRoomGaps} />
          <Stat label="Investor/buyer targets" value={stats.targets} />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground">Business</label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue placeholder="All / group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All / group</SelectItem>
                {(businesses ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground">Readiness type</label>
            <Select value={readinessType} onValueChange={(v) => setReadinessType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {READINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled={running} onClick={() => run()}>Dry-run score</Button>
          <Button disabled={running} onClick={() => run("CREATE EXIT READINESS REVIEW")}>Create review</Button>
        </div>

        {preview && (
          <div className="rounded-md border border-border/40 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <Badge>{preview.dry_run ? "Dry-run" : "Saved"}</Badge>
              <span>Score: <strong>{preview.readiness_score}</strong></span>
              <span className="text-muted-foreground">Type: {preview.readiness_type}</span>
            </div>
            {!!preview.blockers?.length && (
              <div>
                <div className="font-medium mb-1">Blockers</div>
                <ul className="list-disc pl-5 space-y-0.5">{preview.blockers.map((b: string) => <li key={b}>{b}</li>)}</ul>
              </div>
            )}
            {!!preview.recommended_actions?.length && (
              <div>
                <div className="font-medium mb-1">Recommended actions</div>
                <ul className="list-disc pl-5 space-y-0.5">{preview.recommended_actions.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Recent readiness reviews</div>
          <div className="space-y-2">
            {(readiness ?? []).slice(0, 8).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.readiness_type}</Badge>
                  <span className="text-muted-foreground">score {Math.round(Number(r.readiness_score ?? 0))}</span>
                  <span className="text-muted-foreground">{(r.blockers as any[])?.length ?? 0} blockers</span>
                </div>
                <Badge variant={r.readiness_status === "draft" ? "secondary" : "outline"}>{r.readiness_status}</Badge>
              </div>
            ))}
            {!(readiness ?? []).length && <div className="text-xs text-muted-foreground">No readiness reviews yet — run a dry-run to preview.</div>}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Investor / buyer targets</div>
          <div className="space-y-2">
            {(targets ?? []).slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.target_name}</span>
                  <Badge variant="outline">{t.target_type}</Badge>
                </div>
                <Badge variant="secondary">{t.outreach_status}</Badge>
              </div>
            ))}
            {!(targets ?? []).length && <div className="text-xs text-muted-foreground">No targets registered. Add internally — outreach stays gated.</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/40 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}