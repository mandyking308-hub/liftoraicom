import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type CloseoutRecord = {
  id: string;
  classification: string | null;
  closeout_status: string;
  external_go_live_status: string | null;
  command_centre_status: string | null;
  brain_status: string | null;
  business_factory_status: string | null;
  provider_status: string | null;
  next_phase: string | null;
  created_at: string;
};

export default function LiftorBuildPhaseCloseoutPanel() {
  const [latest, setLatest] = useState<CloseoutRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("liftor_build_phase_closeout_records")
      .select(
        "id, classification, closeout_status, external_go_live_status, command_centre_status, brain_status, business_factory_status, provider_status, next_phase, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest((data as CloseoutRecord) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runCloseout = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "liftor-build-phase-closeout",
        { body: {} },
      );
      if (error) throw error;
      toast.success(
        `Closeout recorded: ${data?.classification ?? "unknown"}`,
      );
      await load();
    } catch (e: any) {
      toast.error(`Closeout failed: ${e?.message ?? String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Liftor Build Phase Closeout
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Final handover for Prompts 21A–22J. Internal only.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> External LOCKED_BY_DESIGN
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : latest ? (
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Classification: </span>
              <span className="font-medium">{latest.classification}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Brain: </span>
                {latest.brain_status}
              </div>
              <div>
                <span className="text-muted-foreground">Factory: </span>
                {latest.business_factory_status}
              </div>
              <div>
                <span className="text-muted-foreground">Command Centre: </span>
                {latest.command_centre_status}
              </div>
              <div>
                <span className="text-muted-foreground">Provider: </span>
                {latest.provider_status}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Last closeout: {new Date(latest.created_at).toLocaleString()}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Next phase: </span>
              {latest.next_phase}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No closeout record yet. Run closeout to capture the final
            build-phase state.
          </p>
        )}

        <div className="text-xs text-muted-foreground border border-border/60 rounded-md p-3 bg-muted/20">
          Next action after Athens (post 28 May): run NeonCandy execution
          readiness (Prompt 23A). Do not enable external gates or start
          campaigns until then.
        </div>

        <div className="flex gap-2">
          <Button onClick={runCloseout} disabled={running} size="sm">
            {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Run closeout
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/founder/build-phase-closeout">Open handover</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}