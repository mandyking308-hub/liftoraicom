import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, ShieldAlert, RefreshCw, Lock, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  { key: "pre_revenue", label: "Pre-revenue" },
  { key: "post_revenue", label: "Post-revenue" },
  { key: "profit_based", label: "Profit (EBITDA)" },
  { key: "recurring_revenue", label: "Recurring (ARR)" },
  { key: "asset_based", label: "Asset-based" },
  { key: "strategic_buyer", label: "Strategic buyer" },
  { key: "exit_readiness", label: "Exit readiness" },
  { key: "group_portfolio", label: "Group portfolio" },
] as const;

function fmt(n: number | null | undefined, ccy = "GBP") {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(Number(n));
}

export default function BusinessValuationIntelligencePanel() {
  const [stage, setStage] = useState<string>("pre_revenue");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Generic input fields (shown contextually)
  const [revenue, setRevenue] = useState<string>("");
  const [growth, setGrowth] = useState<string>("");
  const [recurringPct, setRecurringPct] = useState<string>("");
  const [ebitda, setEbitda] = useState<string>("");
  const [mrr, setMrr] = useState<string>("");
  const [churn, setChurn] = useState<string>("");
  const [grossMargin, setGrossMargin] = useState<string>("");
  const [monthlyTarget, setMonthlyTarget] = useState<string>("1000");

  const { data: latest } = useQuery({
    queryKey: ["valuation_latest"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("business_valuation_snapshots").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  async function runPreview(persist = false) {
    setBusy(true);
    try {
      const input: any = {
        revenue_amount: revenue ? Number(revenue) : undefined,
        growth_rate: growth ? Number(growth) : undefined,
        recurring_revenue_pct: recurringPct ? Number(recurringPct) : undefined,
        ebitda: ebitda ? Number(ebitda) : undefined,
        monthly_recurring_revenue: mrr ? Number(mrr) : undefined,
        churn_rate: churn ? Number(churn) : undefined,
        gross_margin: grossMargin ? Number(grossMargin) : undefined,
        currency: "GBP",
      };
      const target = monthlyTarget ? { monthly_revenue_target: Number(monthlyTarget), recurring_revenue_pct: 0.6 } : undefined;
      const { data, error } = await supabase.functions.invoke("business-valuation-preview", {
        body: { stage, input, target, persist, business_id: undefined },
      });
      if (error) throw error;
      setResult(data);
      toast.success(persist ? "Snapshot saved (founder-only, internal)" : "Dry-run valuation generated");
    } catch (e: any) {
      toast.error(e?.message ?? "valuation error");
    } finally {
      setBusy(false);
    }
  }

  const r = result?.result ?? null;
  const tp = result?.target_projection ?? null;

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" /> Business Valuation Intelligence
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">CURRENT</Badge>
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]"><Lock size={9} className="mr-1" />Internal only · adviser review required</Badge>
          </CardTitle>
          <div className="flex items-center gap-1 flex-wrap">
            {STAGES.map((s) => (
              <Button key={s.key} size="sm" variant={stage === s.key ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setStage(s.key)}>{s.label}</Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Inputs (contextual) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {(stage === "post_revenue" || stage === "strategic_buyer") && (
            <>
              <Field label="Annual revenue (£)" v={revenue} set={setRevenue} placeholder="0" />
              <Field label="YoY growth (0–1)" v={growth} set={setGrowth} placeholder="0.5" />
              <Field label="Recurring %" v={recurringPct} set={setRecurringPct} placeholder="0.6" />
            </>
          )}
          {stage === "profit_based" && <Field label="EBITDA / SDE (£)" v={ebitda} set={setEbitda} placeholder="0" />}
          {stage === "recurring_revenue" && (
            <>
              <Field label="MRR (£)" v={mrr} set={setMrr} placeholder="0" />
              <Field label="Monthly churn (0–1)" v={churn} set={setChurn} placeholder="0.05" />
              <Field label="Gross margin (0–1)" v={grossMargin} set={setGrossMargin} placeholder="0.7" />
            </>
          )}
          <Field label="Revenue target (£/mo) for projection" v={monthlyTarget} set={setMonthlyTarget} placeholder="1000" />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => runPreview(false)} disabled={busy} className="h-7 text-xs">
            <RefreshCw size={12} className="mr-1" /> Run dry-run valuation
          </Button>
          <Button size="sm" variant="outline" onClick={() => runPreview(true)} disabled={busy} className="h-7 text-xs">
            Save internal snapshot
          </Button>
        </div>

        {/* Result */}
        {r && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles size={12} className="text-primary" />
              <span className="font-semibold">{result.stage} · {r.method}</span>
              <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">confidence: {result.confidence_level}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Low" value={fmt(r.low, result.currency)} />
              <Metric label="Base" value={fmt(r.base, result.currency)} tone="primary" />
              <Metric label="High" value={fmt(r.high, result.currency)} />
            </div>
            {r.multiples && r.multiples.base != null && (
              <p className="text-[10px] text-muted-foreground">
                Multiples used: {Number(r.multiples.low).toFixed(2)}× / {Number(r.multiples.base).toFixed(2)}× / {Number(r.multiples.high).toFixed(2)}×
              </p>
            )}
            {Array.isArray(r.items) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {r.items.map((it: any) => (
                  <div key={it.key} className="flex items-center gap-1 text-[10px]">
                    {it.ready ? <CheckCircle2 size={10} className="text-green-400" /> : <AlertTriangle size={10} className="text-yellow-400" />}
                    <span className="text-muted-foreground">{it.key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Revenue target projection */}
        {tp && (
          <div className="rounded-md border border-border/60 bg-background/40 p-3 text-xs space-y-1">
            <div className="font-semibold">Revenue target projection</div>
            <p>Monthly target: <span className="text-primary">{fmt(tp.monthly_revenue_target)}</span> · Annualised: <span className="text-primary">{fmt(tp.annualised_revenue_target)}</span></p>
            <p>Projected post-revenue value (12-mo sustained):
              {" "}{fmt(tp.projected_post_revenue_value.low)} – <span className="text-primary">{fmt(tp.projected_post_revenue_value.base)}</span> – {fmt(tp.projected_post_revenue_value.high)}
            </p>
            <p className="text-[10px] text-muted-foreground">{tp.note}</p>
          </div>
        )}

        {/* Blockers */}
        {result?.blockers?.length > 0 && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-[11px] text-yellow-100">
            <div className="flex items-center gap-1 font-semibold mb-1"><AlertTriangle size={11} /> Blockers</div>
            <ul className="list-disc pl-4">{result.blockers.map((b: string) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}

        {/* Neon Candy default narrative */}
        <div className="rounded-md border border-border/60 bg-background/40 p-3 text-[11px] space-y-1">
          <div className="font-semibold text-foreground">Neon Candy — current valuation posture</div>
          <p>Stage: <span className="text-primary">pre-revenue / early traction</span> · Confidence: <span className="text-yellow-400">low</span></p>
          <p><span className="font-medium">Value drivers:</span> IP, content catalogue, audience growth potential, automation, distribution, partnerships, recurring monetisation potential.</p>
          <p><span className="font-medium">Blockers:</span> no revenue proof, no subscriber proof, no profit history, no live campaign data.</p>
          <p><span className="font-medium">Next actions to lift valuation:</span> launch first paid offer · land first 10 paying customers · capture recurring subscriptions · log clean revenue/profit · publish content cadence · capture proof.</p>
        </div>

        {/* Safety + latest snapshots */}
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-[10px] text-yellow-100 flex items-start gap-2">
          <ShieldAlert size={11} className="mt-0.5" />
          <span>{result?.safety_note ?? "Indicative internal estimate only. Not financial advice. Adviser review required before relying on this for investment, sale, tax, lending or legal decisions."} No external disclosure. No publish. No send to investors / buyers / advisers.</span>
        </div>

        {Array.isArray(latest) && latest.length > 0 && (
          <div className="text-[11px]">
            <div className="font-semibold mb-1">Recent internal snapshots</div>
            <div className="max-h-40 overflow-auto rounded border border-border/40">
              <table className="w-full text-[10px]">
                <thead className="bg-muted/30 text-muted-foreground"><tr>
                  <th className="text-left px-2 py-1">When</th><th className="text-left px-2 py-1">Stage</th><th className="text-left px-2 py-1">Low</th><th className="text-left px-2 py-1">Base</th><th className="text-left px-2 py-1">High</th>
                </tr></thead>
                <tbody>
                  {latest.map((s: any) => (
                    <tr key={s.id} className="border-t border-border/30">
                      <td className="px-2 py-1">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-2 py-1">{s.valuation_stage}</td>
                      <td className="px-2 py-1">{fmt(s.low_estimate, s.currency)}</td>
                      <td className="px-2 py-1 text-primary">{fmt(s.base_estimate, s.currency)}</td>
                      <td className="px-2 py-1">{fmt(s.high_estimate, s.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, v, set, placeholder }: { label: string; v: string; set: (s: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="h-7 text-xs" />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className="rounded border border-border/40 bg-background/40 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${tone === "primary" ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}