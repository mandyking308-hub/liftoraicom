import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listAll, overallCompleteness, fieldCounts, TUNNEL_STEPS, type TunnelState } from "@/lib/businessSetupTunnel";

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
  const [selectedId, setSelectedId] = useState<string>("");
  const counts = useMemo(fieldCounts, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("businesses").select("id, name").limit(200);
        setBusinesses((data as unknown as Biz[]) || []);
      } catch { setBusinesses([]); }
    })();
  }, []);

  const drafts = useMemo(() => listAll(), []);
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
          <p className="text-sm text-muted-foreground mt-1">Founder-only daily view. No external sending. No automated actions.</p>
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

            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link to={`/founder/business-setup-tunnel?mode=continue`}>Resume setup tunnel</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/founder/copilot">Ask Liftor what to do next</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/founder/command-centre">Command Centre</Link></Button>
            </div>
          </>
        )}
      </div>
    </FounderLayout>
  );
}