import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RTLayout } from "./_shared";
import { fetchTruthRules, type TruthRule } from "@/lib/reportingTruthEngine";

export default function Definitions() {
  const [rules, setRules] = useState<TruthRule[]>([]);
  useEffect(() => { fetchTruthRules().then(setRules); }, []);
  return (
    <RTLayout title="Rule Definitions" subtitle="How Liftor decides what is confirmed vs estimated, who is active, and what counts as test data.">
      {rules.map(r => (
        <Card key={r.id} className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {r.rule_name}
              <Badge variant="outline" className="text-[10px]">{r.rule_type.replace(/_/g," ")}</Badge>
              {!r.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p>{r.rule_summary}</p>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="border border-border/50 rounded p-2">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Source priority</p>
                <pre className="text-[11px] whitespace-pre-wrap font-mono">{JSON.stringify(r.source_priority_order, null, 2)}</pre>
              </div>
              <div className="border border-border/50 rounded p-2">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Exclusions</p>
                <pre className="text-[11px] whitespace-pre-wrap font-mono">{JSON.stringify(r.exclusion_conditions, null, 2)}</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </RTLayout>
  );
}