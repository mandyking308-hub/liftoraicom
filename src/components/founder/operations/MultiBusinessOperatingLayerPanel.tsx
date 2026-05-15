import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, RefreshCw, ShieldCheck, Lock, Cog } from "lucide-react";

type BizRow = {
  business_id: string;
  business_name: string;
  operating_status: string;
  readiness: "ready" | "configurable" | "blocked" | string;
  blockers: string[];
  modules_enabled_count: number;
  modules_total: number;
  agents_enabled_count: number;
  agents_total: number;
  provider_lanes: { smartlead: boolean; native_email: boolean; apollo: boolean };
  external_locks: {
    auto_send_allowed: boolean;
    external_provider_mutation_allowed: boolean;
    agents_with_external_send: number;
    agents_with_provider_post: number;
    agents_with_credit_spend: number;
  };
  next_action: string;
};

export function MultiBusinessOperatingLayerPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ businesses: BizRow[]; totals: any } | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("business-operating-readiness", { body: {} });
      if (error) throw error;
      setData(res as any);
    } catch (e: any) {
      toast({ title: "Failed to load readiness", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = data?.totals;
  const businesses = data?.businesses ?? [];

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Multi-business operating layer
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />no autonomous send</Badge>
            <Badge variant="outline" className="text-[10px]">no Apollo spend</Badge>
            <Badge variant="outline" className="text-[10px]">no Smartlead POST</Badge>
            <Badge variant="outline" className="text-[10px]">founder approval gated</Badge>
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Stat label="Businesses" value={totals.businesses} />
            <Stat label="Ready" value={totals.ready} />
            <Stat label="Configurable" value={totals.configurable} />
            <Stat label="Blocked" value={totals.blocked} />
          </div>
        )}

        {businesses.length === 0 ? (
          <div className="text-sm text-muted-foreground">No businesses configured yet.</div>
        ) : (
          <div className="space-y-2">
            {businesses.map((b) => (
              <div key={b.business_id} className="rounded-md border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cog className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">{b.business_name}</span>
                    <Badge variant="outline" className="text-[10px]">{b.operating_status}</Badge>
                  </div>
                  <Badge
                    variant={b.readiness === "ready" ? "default" : b.readiness === "blocked" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {b.readiness}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Stat label="Modules" value={`${b.modules_enabled_count}/${b.modules_total}`} />
                  <Stat label="Agents" value={`${b.agents_enabled_count}/${b.agents_total}`} />
                  <Stat label="Native email" value={b.provider_lanes.native_email ? "on" : "off"} />
                  <Stat label="Smartlead" value={b.provider_lanes.smartlead ? "on" : "off"} />
                  <Stat label="Apollo" value={b.provider_lanes.apollo ? "on" : "off"} />
                  <Stat label="Auto-send" value={b.external_locks.auto_send_allowed ? "ALLOWED" : "locked"} />
                  <Stat label="Provider POST" value={b.external_locks.external_provider_mutation_allowed ? "ALLOWED" : "locked"} />
                  <Stat label="Credit spend" value={b.external_locks.agents_with_credit_spend} />
                </div>
                {b.blockers.length > 0 && (
                  <div className="text-xs text-destructive flex flex-wrap gap-1">
                    {b.blockers.map((bl, i) => <Badge key={i} variant="destructive" className="text-[10px]">{bl}</Badge>)}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" /> external sends locked
                  </span>
                  <span className="text-primary">→ {b.next_action}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-border/40 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-xs">{value}</div>
    </div>
  );
}

export default MultiBusinessOperatingLayerPanel;