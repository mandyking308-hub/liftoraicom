import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listAll,
  listAllRemote,
  overallCompleteness,
  fieldCounts,
  TUNNEL_STEPS,
  MODULE_AREAS,
  type TunnelState,
} from "@/lib/businessSetupTunnel";
import { listLatestPaceAll, listSalesTargetsAll, loadCurrentRevenueRollup } from "@/lib/commercialPace";

type Biz = { id: string; name: string };

const LANES: { key: string; title: string; from: string[] }[] = [
  { key: "priority", title: "Today's priority", from: ["sales", "operations"] },
  { key: "blockers", title: "Blockers", from: ["identity", "web", "knowledge"] },
  { key: "founder", title: "Waiting on founder", from: ["sales", "marketing", "evidence"] },
  { key: "adviser", title: "Waiting on adviser", from: ["finance", "evidence"] },
  { key: "sales_marketing", title: "Sales / marketing", from: ["sales", "marketing"] },
  { key: "customer_support", title: "Customer / support", from: ["support"] },
  { key: "finance", title: "Finance / compliance", from: ["finance"] },
  { key: "operations", title: "Operations / SOPs", from: ["operations"] },
  { key: "exit", title: "Exit / buyer warm-up", from: ["evidence"] },
];

export default function DailyOperator() {
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [remoteDrafts, setRemoteDrafts] = useState<TunnelState[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [pace, setPace] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [rollup, setRollup] = useState<any | null>(null);
  const counts = useMemo(fieldCounts, []);

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, tunnelRuns, p, t] = await Promise.all([
          supabase.from("businesses").select("id, name").limit(200),
          listAllRemote(),
          listLatestPaceAll(),
          listSalesTargetsAll(),
        ]);
        setBusinesses((data as unknown as Biz[]) || []);
        setRemoteDrafts(tunnelRuns);
        setPace(p); setTargets(t);
      } catch {
        setBusinesses([]);
        setRemoteDrafts([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedId || selectedId.startsWith("draft:")) { setRollup(null); return; }
      setRollup(await loadCurrentRevenueRollup(selectedId));
    })();
  }, [selectedId]);

  const localDrafts = useMemo(() => listAll(), []);
  const drafts = useMemo(() => {
    const seen = new Set(remoteDrafts.map((d) => d.businessId));
    return [...remoteDrafts, ...localDrafts.filter((d) => !seen.has(d.businessId))];
  }, [remoteDrafts, localDrafts]);

  const allOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    businesses.forEach((b) => map.set(b.id, b));
    drafts.forEach((d) => map.set(d.businessId, { id: d.businessId, name: d.businessName }));
    return Array.from(map.values());
  }, [businesses, drafts]);

  const tunnel: TunnelState | null = useMemo(() => {
    if (!selectedId) return null;
    return drafts.find((d) => d.businessId === selectedId) || null;
  }, [drafts, selectedId]);

  const overall = tunnel ? overallCompleteness(tunnel, counts) : null;

  return (
    <FounderLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Daily Business Operator</h1>
          <p className="text-sm text-muted-foreground mt-1">Founder-only daily view. Reads the setup tunnel spine first, with local draft fallback. No external sending. No automated actions.</p>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Choose a business</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allOptions.length === 0 && <p className="text-sm text-muted-foreground">No businesses yet. Use the Setup Tunnel to create one.</p>}
            {allOptions.map((b) => (
              <Button key={b.id} size="sm" variant={selectedId === b.id ? "default" : "outline"} onClick={() => setSelectedId(b.id)}>{b.name}</Button>
            ))}
          </CardContent>
        </Card>

        {selectedId && (
          <>
            {overall !== null && (
              <p className="text-xs text-muted-foreground">Setup completeness: <strong>{overall}%</strong></p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LANES.map((lane) => {
                const items: string[] = [];
                if (tunnel) {
                  lane.from.forEach((sk) => {
                    const step = tunnel.steps[sk as keyof typeof tunnel.steps];
                    if (!step) return;
                    if (step.status === "not_started" || step.status === "skipped") {
                      items.push(`Setup step incomplete: ${TUNNEL_STEPS.find((s) => s.key === sk)?.label}`);
                    }
                  });
                }
                return (
                  <Card key={lane.key}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{lane.title}</CardTitle></CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-1">
                      {items.length === 0 ? <div>Nothing flagged from the setup tunnel.</div>
                        : items.map((i) => <div key={i}>• {i}</div>)}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-amber-500/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-500">Safety</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>• Healthcare overlay: BLOCKED</div>
                <div>• Data room: CLOSED by default</div>
                <div>• Buyer warm-up: quiet tracking only</div>
                <div>• Emails / social / providers: not active from this view</div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Commercial pace</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                {(() => {
                  const t = targets.find((x) => x.business_id === selectedId);
                  const p = pace.find((x) => x.business_id === selectedId);
                  if (!t) return <p className="text-amber-500">No sales target yet. Open Setup Tunnel → step "Sales target & revenue pace" and click "Save target & calculate pace".</p>;
                  return (
                    <>
                      <div>Monthly target: <strong>{t.currency} {Math.round(Number(t.target_monthly_revenue || 0)).toLocaleString()}</strong></div>
                      <div>MTD revenue: <strong>{Math.round(rollup?.mtd ?? 0).toLocaleString()}</strong> · MRR(30d): <strong>{Math.round(rollup?.mrr ?? 0).toLocaleString()}</strong></div>
                      {p && (
                        <>
                          <div>Revenue gap: <strong>{Math.round(Number(p.revenue_gap || 0)).toLocaleString()}</strong></div>
                          <div>Sales needed — month: <strong>{p.sales_needed_month}</strong>, week: <strong>{p.sales_needed_week}</strong>, day: <strong>{p.sales_needed_day}</strong></div>
                          <div>Leads needed — month: <strong>{p.leads_needed_month}</strong>, week: <strong>{p.leads_needed_week}</strong>, day: <strong>{p.leads_needed_day}</strong></div>
                          <div>Pace status: <strong className={p.pace_status === "behind" ? "text-amber-500" : "text-emerald-500"}>{p.pace_status}</strong></div>
                          <div className="text-muted-foreground">Today: {p.recommended_daily_action}</div>
                        </>
                      )}
                      {!p && <p className="text-muted-foreground">No pace calc yet. Open the setup tunnel commercial step and click "Save target & calculate pace".</p>}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Module connections (from Supabase setup tunnel)</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                {MODULE_AREAS.map((a) => {
                  const c = tunnel?.moduleConnections?.[a.key];
                  const status = c?.status ?? "not_attempted";
                  const color = status === "connected" ? "text-emerald-500"
                    : status === "manual_action_needed" ? "text-amber-500" : "text-muted-foreground";
                  return (
                    <div key={a.key} className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-foreground">{a.label}</span>{" "}
                        <span className="text-muted-foreground">— {c?.note ?? "not attempted; run Promote in setup tunnel."}</span>
                      </div>
                      <span className={`text-[10px] uppercase whitespace-nowrap ${color}`}>{status.replace(/_/g, " ")}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link to={`/founder/business-setup-tunnel?mode=continue`}>Resume setup tunnel</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/founder/money">Money — overnight view</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/founder/copilot">Ask Liftor what to do next</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/founder/command-centre">Command Centre</Link></Button>
            </div>
          </>
        )}
      </div>
    </FounderLayout>
  );
}
