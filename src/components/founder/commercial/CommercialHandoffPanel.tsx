import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ShieldCheck, Lock, RefreshCw, FileText, MonitorPlay, Handshake, AlertTriangle } from "lucide-react";

type Candidate = {
  contact_id?: string | null;
  conversation_id?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  handoff_type: "proposal_ready" | "demo_ready" | "deal_ready" | "founder_review";
  qualification_summary: string;
  detected_need?: string;
  proposed_offer?: string;
  proposed_next_step?: string;
  estimated_value_min?: number;
  estimated_value_max?: number;
  source_system: string;
  source_id?: string;
  blockers: string[];
};

type Resp = {
  ok: boolean;
  apply_enabled: boolean;
  apply_disabled_reason: string;
  total_candidates: number;
  by_type: Record<string, number>;
  pipeline_value_estimate: { min: number; max: number };
  existing_handoff_review_count: number;
  candidates: Candidate[];
};

const typeIcon: Record<string, any> = {
  proposal_ready: FileText,
  demo_ready: MonitorPlay,
  deal_ready: Handshake,
  founder_review: AlertTriangle,
};
const typeClass: Record<string, string> = {
  proposal_ready: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  demo_ready: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  deal_ready: "bg-green-500/15 text-green-400 border-green-500/30",
  founder_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

export default function CommercialHandoffPanel() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["commercial-handoff-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("commercial-handoff-preview", { body: {} });
      if (error) throw error;
      return data as Resp;
    },
  });

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase size={18} className="text-primary" /> Commercial Handoff (preview)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send · No-Auto-Create
          </Badge>
          <Badge variant="outline" className={`text-[10px] uppercase ${data?.apply_enabled ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
            <Lock size={10} className="mr-1" /> apply {data?.apply_enabled ? "enabled" : "disabled"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading commercial handoff preview…</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Candidates</p>
                <p className="text-2xl font-semibold">{data.total_candidates}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Pipeline est.</p>
                <p className="text-sm font-semibold">${data.pipeline_value_estimate.min.toLocaleString()} – ${data.pipeline_value_estimate.max.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Persisted reviews</p>
                <p className="text-sm">{data.existing_handoff_review_count}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">By type</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(data.by_type).map(([k, v]) => (
                    <Badge key={k} variant="outline" className={`text-[9px] ${typeClass[k] ?? ""}`}>{k} · {v}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {data.candidates.slice(0, 12).map((c, i) => {
                const Icon = typeIcon[c.handoff_type] ?? AlertTriangle;
                return (
                  <div key={`${c.source_system}-${c.source_id}-${i}`} className="rounded-md border border-border/50 p-2.5 bg-card/40 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] uppercase ${typeClass[c.handoff_type] ?? ""}`}>
                            <Icon size={10} className="mr-1" />{c.handoff_type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{c.source_system}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-1">
                          {c.business_name ?? c.contact_name ?? c.contact_id ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.qualification_summary}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" disabled title="Apply disabled — feature flag COMMERCIAL_HANDOFF_APPLY_ENABLED required">
                          <Lock size={12} className="mr-1" /> Approve handoff
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Offer: </span>{c.proposed_offer ?? "—"}</div>
                      <div><span className="text-muted-foreground">Next: </span>{c.proposed_next_step ?? "—"}</div>
                      <div><span className="text-muted-foreground">Value: </span>{c.estimated_value_min ? `$${c.estimated_value_min.toLocaleString()} – $${(c.estimated_value_max ?? c.estimated_value_min).toLocaleString()}` : "—"}</div>
                    </div>
                    {c.blockers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.blockers.map((b) => (
                          <Badge key={b} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">blocker · {b}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {data.candidates.length === 0 && (
                <p className="text-xs text-muted-foreground">No qualified handoff candidates right now.</p>
              )}
              {data.candidates.length > 12 && (
                <p className="text-[11px] text-muted-foreground">+ {data.candidates.length - 12} more candidates…</p>
              )}
            </div>

            <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground">
              Apply button is presentation-only until <code>COMMERCIAL_HANDOFF_APPLY_ENABLED=true</code> and confirmation phrase <code>APPLY COMMERCIAL HANDOFF</code> are supplied. No proposals, demos, deals, invoices, or emails are created from this preview.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}