import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fetchAuditEvents, type AuditEventCategory, type AuditSensitivity } from "@/lib/globalAuditLedger";
import { AuditLayout, categoryBadge, sensitivityBadge } from "./_shared";

const CATEGORIES: AuditEventCategory[] = ["ai","approval","external_action","data_change","access","finance","privacy","security","configuration","workflow","provider","document","decision","other"];
const SENSITIVITIES: AuditSensitivity[] = ["low","medium","high","critical"];

export default function AuditEvents() {
  const [category, setCategory] = useState<AuditEventCategory | "">("");
  const [sensitivity, setSensitivity] = useState<AuditSensitivity | "">("");
  const [trace, setTrace] = useState("");
  const [includeTest, setIncludeTest] = useState(true);
  const [externalOnly, setExternalOnly] = useState(false);
  const [module, setModule] = useState("");
  const q = useQuery({
    queryKey: ["audit-events", category, sensitivity, trace, includeTest, externalOnly, module],
    queryFn: () => fetchAuditEvents({
      limit: 500,
      event_category: (category || null) as any,
      sensitivity_level: (sensitivity || null) as any,
      trace_id: trace.trim() || null,
      external_only: externalOnly,
      include_test: includeTest,
      source_module: module.trim() || null,
    }),
  });
  const data = useMemo(() => q.data ?? [], [q.data]);
  return (
    <AuditLayout title="Audit events" subtitle="Filter by category, sensitivity, module, external side-effect or trace id. Test rows can be included or excluded.">
      <Card className="tech-card p-3 grid grid-cols-1 md:grid-cols-6 gap-2 text-xs">
        <select className="bg-background border border-border/50 rounded px-2 py-1" value={category} onChange={e => setCategory(e.target.value as any)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="bg-background border border-border/50 rounded px-2 py-1" value={sensitivity} onChange={e => setSensitivity(e.target.value as any)}>
          <option value="">All sensitivity</option>
          {SENSITIVITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input placeholder="Module (e.g. ai_gateway)" value={module} onChange={e => setModule(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Trace id" value={trace} onChange={e => setTrace(e.target.value)} className="h-8 text-xs" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={externalOnly} onChange={e => setExternalOnly(e.target.checked)} /> External side-effect only</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={includeTest} onChange={e => setIncludeTest(e.target.checked)} /> Include test data</label>
      </Card>

      <div className="space-y-2">
        {data.map(e => (
          <Card key={e.id} className="tech-card p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${categoryBadge(e.event_category)}`}>{e.event_category}</Badge>
              <Badge variant="outline" className={`text-[10px] ${sensitivityBadge(e.sensitivity_level)}`}>{e.sensitivity_level}</Badge>
              {e.is_test_data && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}
              {e.external_side_effect && <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">external</Badge>}
              <code className="text-[10px]">{e.source_module}</code>
              <code className="text-[10px] text-muted-foreground">{e.event_type}</code>
              <span className="text-[10px] text-muted-foreground ml-auto">{e.created_at.slice(0,19).replace("T"," ")}</span>
            </div>
            <p className="mt-1">{e.action_summary}</p>
            <p className="text-[10px] text-muted-foreground">
              {e.actor_type}{e.actor_label ? ` · ${e.actor_label}` : ""}{e.business_id ? ` · business ${String(e.business_id).slice(0,8)}` : ""}{e.trace_id ? ` · trace ${e.trace_id}` : ""}
            </p>
            {((Object.keys(e.before_summary ?? {}).length) || (Object.keys(e.after_summary ?? {}).length)) ? (
              <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <pre className="text-[10px] bg-background/40 border border-border/40 rounded p-2 overflow-x-auto">before {JSON.stringify(e.before_summary, null, 2)}</pre>
                <pre className="text-[10px] bg-background/40 border border-border/40 rounded p-2 overflow-x-auto">after {JSON.stringify(e.after_summary, null, 2)}</pre>
              </div>
            ) : null}
          </Card>
        ))}
        {!data.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No matching audit events.</Card>}
      </div>
    </AuditLayout>
  );
}