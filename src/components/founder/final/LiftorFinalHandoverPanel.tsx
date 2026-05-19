import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { LIFTOR_FINAL_HANDOVER } from "@/lib/liftorUserManualContent";

export default function LiftorFinalHandoverPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("liftor-wide-final-acceptance", { body: {} });
    setResult(data);
    setLoading(false);
  };
  const status: string | undefined = result?.overall_status;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-400" /> Liftor Final Handover
          <Badge variant="secondary" className="bg-green-500/10 text-green-300 border-green-500/30 text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> {LIFTOR_FINAL_HANDOVER.classification}
          </Badge>
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={10} className="mr-1" /> {LIFTOR_FINAL_HANDOVER.external_go_live}
          </Badge>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>{loading ? "Running…" : "Run Final Acceptance"}</Button>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">{LIFTOR_FINAL_HANDOVER.summary}</p>
        <div>
          <p className="font-semibold mb-1">First 15 actions for Mandy</p>
          <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
            {LIFTOR_FINAL_HANDOVER.first_15_actions.map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>
        <div>
          <p className="font-semibold mb-1">Intentional external locks</p>
          <div className="flex flex-wrap gap-1">
            {LIFTOR_FINAL_HANDOVER.intentional_locks.map((l, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{l}</Badge>
            ))}
          </div>
        </div>
        {result && (
          <div>
            <p className="font-semibold mb-1">Acceptance result: {status}</p>
            <pre className="bg-secondary/40 p-2 rounded text-[10px] max-h-80 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        <p className="text-[11px] text-green-300">{LIFTOR_FINAL_HANDOVER.recommendation}</p>
      </CardContent>
    </Card>
  );
}