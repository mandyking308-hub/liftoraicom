import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileSignature, Briefcase, Play, ShieldCheck, Lock, Send } from "lucide-react";

type AgentKey = "proposal" | "commercial";

const AGENT_CONF: Record<AgentKey, { fn: string; phrase: string; title: string; icon: any; description: string }> = {
  proposal: {
    fn: "proposal-agent-run",
    phrase: "RUN PROPOSAL AGENT",
    title: "Proposal Agent (live, internal)",
    icon: FileSignature,
    description: "Reads approved actions + qualified handoffs and creates internal proposal draft reviews + founder approval items. Never sends.",
  },
  commercial: {
    fn: "commercial-agent-run",
    phrase: "RUN COMMERCIAL AGENT",
    title: "Commercial Handoff Agent (live, internal)",
    icon: Briefcase,
    description: "Classifies opportunities into proposal/demo/deal/founder review and creates handoff reviews + approval items. Never creates deals or invoices.",
  },
};

function AgentBlock({ agent }: { agent: AgentKey }) {
  const conf = AGENT_CONF[agent];
  const qc = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [maxItems, setMaxItems] = useState(agent === "proposal" ? 10 : 15);
  const [lastResult, setLastResult] = useState<any>(null);

  const runMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const { data, error } = await supabase.functions.invoke(conf.fn, {
        body: { dry_run: dryRun, confirmation_phrase: dryRun ? "" : phrase, max_items: maxItems },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      setLastResult(data);
      if (data?.blocked) {
        toast.warning(`${conf.title}: ${data.reason}${data.required_phrase ? ` (need "${data.required_phrase}")` : ""}`);
      } else {
        toast.success(`${conf.title}: ${data.handoffs_created ?? data.drafts_created ?? 0} record(s) created`);
        qc.invalidateQueries({ queryKey: ["founder-approval-preview"] });
        qc.invalidateQueries({ queryKey: ["commercial-handoff-preview"] });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Run failed"),
  });

  const Icon = conf.icon;
  const phraseOk = phrase === conf.phrase;
  const cand = lastResult?.candidates ?? [];
  const summaryByType: Record<string, number> = lastResult?.by_type ?? {};

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon size={18} className="text-primary" /> {conf.title}
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <Lock size={10} className="mr-1" /> Internal-Only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{conf.description}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            max={30}
            value={maxItems}
            onChange={(e) => setMaxItems(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="h-8 w-20 text-xs"
          />
          <span className="text-[11px] text-muted-foreground">max items</span>
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={conf.phrase}
            className="h-8 text-xs max-w-xs"
          />
          <Badge variant="outline" className={`text-[10px] ${phraseOk ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-muted"}`}>
            {phraseOk ? "phrase ok" : "phrase required"}
          </Badge>
          <Button size="sm" variant="outline" disabled={runMutation.isPending} onClick={() => runMutation.mutate(true)}>
            <Play size={12} className="mr-1" /> Dry-run
          </Button>
          <Button size="sm" disabled={runMutation.isPending || !phraseOk} onClick={() => runMutation.mutate(false)}>
            <Play size={12} className="mr-1" /> Run live (internal)
          </Button>
        </div>

        {lastResult && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Candidates" value={lastResult.total_candidates ?? 0} />
              <Stat label={agent === "proposal" ? "Drafts created" : "Handoffs created"} value={lastResult.drafts_created ?? lastResult.handoffs_created ?? 0} />
              <Stat label="Approvals created" value={lastResult.approvals_created ?? 0} />
              <Stat label="External sends" value={0} icon={<Send size={11} />} />
            </div>
            {Object.keys(summaryByType).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(summaryByType).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-[10px]">{k} · {v as number}</Badge>
                ))}
              </div>
            )}
            {cand.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase text-muted-foreground">Top candidates (preview)</p>
                {cand.slice(0, 6).map((c: any, i: number) => (
                  <div key={i} className="rounded-md border border-border/40 p-2 bg-card/30 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.handoff_type && <Badge variant="outline" className="text-[10px]">{c.handoff_type}</Badge>}
                      {c.source && <Badge variant="outline" className="text-[10px]">{c.source}</Badge>}
                      {(c.estimated_value_min || c.estimated_value_max) && (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                          ${c.estimated_value_min ?? 0}–${c.estimated_value_max ?? 0}
                        </Badge>
                      )}
                      {(c.blockers ?? []).map((b: string) => (
                        <Badge key={b} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">blocked: {b}</Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-muted-foreground line-clamp-2">{c.qualification_summary ?? c.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground border border-border/40 rounded p-2 bg-card/30">
          Live runs only create internal records (handoff reviews + founder approval items). No proposals are emailed,
          no deals or invoices are created, no Apollo / Smartlead calls happen. Sends remain gated by separate flags.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/40 p-2 bg-card/40">
      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">{icon}{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function LiveCommercialAgentsPanel() {
  return (
    <div className="space-y-3">
      <AgentBlock agent="proposal" />
      <AgentBlock agent="commercial" />
    </div>
  );
}
