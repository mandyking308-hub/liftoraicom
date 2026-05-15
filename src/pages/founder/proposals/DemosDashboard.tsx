import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import CommercialHandoffPanel from "@/components/founder/commercial/CommercialHandoffPanel";
import { ProductisationReadinessPanel } from "@/components/founder/revenue/ProductisationReadinessPanel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Activity, Zap, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DemosDashboard() {
  const [demos, setDemos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ data: d }, { data: e }] = await Promise.all([
      supabase.from("demo_access").select("*").order("created_at", { ascending: false }),
      supabase.from("demo_events").select("*").gte("timestamp", sevenDaysAgo).order("timestamp", { ascending: false }).limit(50),
    ]);
    setDemos(d || []); setEvents(e || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    await supabase.from("demo_access").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Demo revoked" }); load();
  };

  const active = demos.filter(d => d.status === "active");
  const highIntent = demos.filter(d => d.high_intent);
  const totalConv = demos.length;
  const accepted = demos.filter(d => d.status === "active" && d.access_count > 0).length;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Monitor size={24} /> Demo Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Sandbox demo passes. No real client data is exposed.</p>
        </div>

        <ProductisationReadinessPanel />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<Monitor size={18} />} label="Active Demos" value={active.length} />
          <Stat icon={<Activity size={18} />} label="Events (7d)" value={events.length} />
          <Stat icon={<TrendingUp size={18} />} label="High Intent" value={highIntent.length} />
          <Stat icon={<Zap size={18} />} label="Conversion" value={totalConv ? `${Math.round((accepted/totalConv)*100)}%` : "0%"} />
        </div>

        <Card className="tech-card divide-y divide-border/50">
          {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {!loading && demos.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No demos provisioned yet.</div>}
          {demos.map(d => (
            <div key={d.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs">{d.demo_token.slice(0,12)}…</code>
                  <Badge variant={d.status === "active" ? "default" : "outline"}>{d.status}</Badge>
                  {d.high_intent && <Badge className="bg-orange-500/15 text-orange-400">HIGH INTENT</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {d.business_name || "—"} · {d.access_count} accesses · expires {new Date(d.expires_at).toLocaleDateString()}
                  {d.proposal_id && <> · <Link className="underline" to={`/founder/internal-proposals/${d.proposal_id}`}>view proposal</Link></>}
                </div>
              </div>
              {d.status === "active" && <Button size="sm" variant="outline" onClick={() => revoke(d.id)}>Revoke</Button>}
            </div>
          ))}
        </Card>
        <CommercialHandoffPanel />
      </div>
    </FounderLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="tech-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon} {label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}