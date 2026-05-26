import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvalLayout } from "./_shared";

export default function Settings() {
  return (
    <EvalLayout title="Settings" subtitle="Evaluator wiring and policy. The default offline heuristic evaluator runs without external calls; AI Gateway evaluators can be added per suite later.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Policy</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>· Internal AI evals run live. They never block normal operation.</p>
          <p>· Failures create work items and recommendations only.</p>
          <p>· High/critical safety failures surface in the Command Centre.</p>
          <p>· External actions remain approval-gated everywhere.</p>
          <p>· Trace IDs are logged for every result; cost estimates are labelled and aggregated.</p>
        </CardContent>
      </Card>
    </EvalLayout>
  );
}