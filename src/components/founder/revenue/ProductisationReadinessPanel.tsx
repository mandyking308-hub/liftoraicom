import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

type ReadinessSection = { ready: boolean; [k: string]: any };

type Result = {
  ok: boolean;
  generated_at: string;
  packages: any[];
  readiness: {
    public_site: ReadinessSection;
    proposal_intake: ReadinessSection;
    client_portal: ReadinessSection;
    demos: ReadinessSection;
    packages: ReadinessSection;
  };
  blockers: string[];
  founder_only_exposure_warnings: string[];
  next_sales_action: string;
};

export function ProductisationReadinessPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("client-readiness-check", { body: {} });
      if (error) throw error;
      setData(r as Result);
    } catch (e: any) {
      toast({ title: "Readiness check failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const sections = data?.readiness;
  const sellableModules = (data?.packages ?? [])
    .filter((p: any) => p.active && Array.isArray(p.included_modules))
    .flatMap((p: any) => p.included_modules as string[]);
  const uniqueModules = Array.from(new Set(sellableModules));

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Productisation & Client Portal Readiness
            </CardTitle>
            <CardDescription>
              Read-only commercial readiness audit. No emails sent, no provider mutations.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading readiness…</p>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="packages">Packages ({data.packages.length})</TabsTrigger>
              <TabsTrigger value="modules">Modules ({uniqueModules.length})</TabsTrigger>
              <TabsTrigger value="exposure">Founder-only Surfaces</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <ReadinessTile label="Public site" ready={sections!.public_site.ready} />
                <ReadinessTile label="Proposal intake" ready={sections!.proposal_intake.ready} />
                <ReadinessTile label="Client portal" ready={sections!.client_portal.ready} />
                <ReadinessTile label="Demos" ready={sections!.demos.ready} />
                <ReadinessTile label="Packages" ready={sections!.packages.ready} />
              </div>

              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-3 flex items-start gap-2">
                  <Sparkles size={14} className="text-primary mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-primary">Next sales action</p>
                    <p className="text-muted-foreground">{data.next_sales_action}</p>
                  </div>
                </CardContent>
              </Card>

              {data.blockers.length > 0 ? (
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium"><AlertTriangle size={14} /> Blockers</div>
                    <ul className="text-xs list-disc pl-5 space-y-0.5">{data.blockers.map((b,i)=>(<li key={i}>{b}</li>))}</ul>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> No blockers — Liftor is sellable.</p>
              )}
            </TabsContent>

            <TabsContent value="packages" className="mt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                {data.packages.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-lg border border-border/40 bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{p.package_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.package_key}</p>
                      </div>
                      <Badge className={p.active ? "bg-green-500/20 text-green-400 text-[10px]" : "bg-muted text-[10px]"}>
                        {p.active ? "active" : "draft"}
                      </Badge>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(p.included_modules ?? []).map((m: string) => (
                        <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div>Setup: {p.setup_fee_min ? `£${p.setup_fee_min}–£${p.setup_fee_max ?? p.setup_fee_min}` : "—"}</div>
                      <div>Monthly: {p.monthly_fee_min ? `£${p.monthly_fee_min}–£${p.monthly_fee_max ?? p.monthly_fee_min}` : "—"}</div>
                    </div>
                    {p.delivery_notes && <p className="text-[11px] text-muted-foreground italic">{p.delivery_notes}</p>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="modules" className="mt-3">
              <div className="flex flex-wrap gap-1">
                {uniqueModules.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                ))}
                {uniqueModules.length === 0 && <p className="text-xs text-muted-foreground">No sellable modules defined.</p>}
              </div>
            </TabsContent>

            <TabsContent value="exposure" className="mt-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck size={12} className="text-primary" />
                  These surfaces must remain founder/admin only — verify RLS in Security Governance panel.
                </div>
                <ul className="text-xs space-y-1 mt-2">
                  {data.founder_only_exposure_warnings.map((w, i) => (
                    <li key={i} className="p-2 rounded bg-secondary/30 border border-border/40 font-mono">{w}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessTile({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${ready ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"}`}>
      <div className="flex items-center gap-2 text-xs font-medium">
        {ready ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        <span>{label}</span>
      </div>
    </div>
  );
}

export default ProductisationReadinessPanel;