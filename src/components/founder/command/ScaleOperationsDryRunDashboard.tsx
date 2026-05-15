import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, Activity, ShieldCheck } from "lucide-react";

type Stage = { stage: string; status: "ready" | "blocked" | "deferred"; blocker: string | null; next_action: string };

function StageRow({ s, idx }: { s: Stage; idx: number }) {
  const Icon =
    s.status === "ready" ? CheckCircle2 :
    s.status === "deferred" ? Clock : AlertTriangle;
  const tone =
    s.status === "ready" ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/5" :
    s.status === "deferred" ? "text-amber-300 border-amber-500/40 bg-amber-500/5" :
    "text-rose-300 border-rose-500/40 bg-rose-500/5";
  return (
    <div className={`flex items-start gap-3 rounded border p-3 ${tone}`}>
      <div className="font-mono text-[10px] opacity-60 w-5">{String(idx + 1).padStart(2, "0")}</div>
      <Icon className="h-4 w-4 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[12px] font-semibold">{s.stage}</div>
          <Badge variant="outline" className="text-[10px] uppercase">{s.status}</Badge>
        </div>
        {s.blocker && <div className="text-[11px] font-mono mt-0.5">blocker: {s.blocker}</div>}
        <div className="text-[11px] opacity-80 mt-0.5">{s.next_action}</div>
      </div>
    </div>
  );
}

function GroupBlock({ title, items }: { title: string; items: string[] }) {
  const unique = Array.from(new Set(items));
  return (
    <div className="rounded border border-border/60 p-2">
      <div className="text-[11px] font-semibold mb-1">{title.replace(/_/g, " ")}</div>
      {unique.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">none</div>
      ) : unique.map((b) => (
        <div key={b} className="font-mono text-[10px]">{b}</div>
      ))}
    </div>
  );
}

export default function ScaleOperationsDryRunDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("liftor-scale-readiness-dry-run", { body: {} });
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };

  return (
    <Card className="p-5 space-y-4 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Scale Operations Dry-Run Dashboard</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? "Diagnosing…" : "Run dry-run readiness"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Source → CRM → Compliance → Routing → Smartlead → Sequence → Lead Push → Webhook → AI Intake → Proposal → Deal → Finance.
        No emails. No Apollo calls. No Smartlead POSTs. No DB mutation.
      </p>

      {data?.ok === false && (
        <div className="text-[11px] text-rose-300">Error: {data.error}</div>
      )}

      {data?.ok && (
        <>
          <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Business</div>
              <div className="font-mono text-[11px]">{data.business?.business_name ?? "—"}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Native provider</div>
              <div className="font-mono text-[11px]">
                {data.business?.native_provider ? `${data.business.native_provider.mode} · ${data.business.native_provider.is_active ? "active" : "inactive"}` : "—"}
              </div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Smartlead provider</div>
              <div className="font-mono text-[11px]">
                {data.business?.smartlead_provider ? `${data.business.smartlead_provider.mode} · ${data.business.smartlead_provider.is_active ? "active" : "inactive"}` : "—"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {data.stages?.map((s: Stage, i: number) => <StageRow key={s.stage} s={s} idx={i} />)}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(data.blocker_groups ?? {}).map(([k, v]) => (
              <GroupBlock key={k} title={k} items={v as string[]} />
            ))}
          </div>

          <div className="rounded border border-border/60 p-2 text-[11px] flex items-start gap-2">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-primary" />
            <div>
              <div className="font-semibold">Safety state</div>
              <div className="font-mono">can_send_anything_now: {String(data.can_send_anything_now)}</div>
              <div className="font-mono">auto_send_enabled: {String(data.safety?.auto_send_enabled)}</div>
              <div className="font-mono">cron_status: {data.safety?.cron_status}</div>
              <div className="font-mono">worker_fail_closed: {String(data.safety?.worker_fail_closed)}</div>
            </div>
          </div>

          <pre className="rounded border border-border/60 bg-background/40 p-2 text-[10px] overflow-auto max-h-72">
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
      {!data && <p className="text-[11px] text-muted-foreground">Click run to load full readiness snapshot.</p>}
    </Card>
  );
}
