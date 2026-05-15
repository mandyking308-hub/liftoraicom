import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Target, Lightbulb, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Insight = {
  id: string;
  insight_type: string;
  insight_title: string;
  insight_summary: string | null;
  risk_level: string;
  status: string;
  founder_review_required: boolean;
  recommended_offer_change: string | null;
  recommended_content_angle: string | null;
  recommended_sales_angle: string | null;
  recommended_response: string | null;
};

type Competitor = {
  id: string;
  competitor_name: string;
  status: string;
  market_category: string | null;
  offer_summary: string | null;
  pricing_notes: string | null;
};

export default function CompetitorLearningPositioningPanel({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data } = useQuery({
    queryKey: ["competitor-positioning", businessId ?? null],
    queryFn: async () => {
      let cQ = supabase.from("competitor_business_profiles").select("id,competitor_name,status,market_category,offer_summary,pricing_notes").limit(50);
      let iQ = supabase
        .from("competitor_learning_insights")
        .select("id,insight_type,insight_title,insight_summary,risk_level,status,founder_review_required,recommended_offer_change,recommended_content_angle,recommended_sales_angle,recommended_response,business_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (businessId) {
        cQ = cQ.eq("business_id", businessId);
        iQ = iQ.eq("business_id", businessId);
      }
      const [c, i] = await Promise.all([cQ, iQ]);
      return { competitors: (c.data ?? []) as Competitor[], insights: (i.data ?? []) as Insight[] };
    },
    staleTime: 30_000,
  });

  const competitors = data?.competitors ?? [];
  const insights = data?.insights ?? [];
  const offerGaps = insights.filter((i) => i.insight_type === "offer_gap");
  const contentGaps = insights.filter((i) => i.insight_type === "content_gap");
  const proposalAngles = insights.filter((i) => i.insight_type === "proposal_positioning");
  const upsellIdeas = insights.filter((i) => i.insight_type === "upsell_opportunity");
  const riskFlagged = insights.filter((i) => i.risk_level === "high");
  const pending = insights.filter((i) => i.status === "pending");

  const generate = useMutation({
    mutationFn: async () => {
      setRunning(true);
      const { data, error } = await supabase.functions.invoke("offer-positioning-recommendation", {
        body: { business_id: businessId ?? null, dry_run: false, confirmation: "CREATE OFFER POSITIONING RECOMMENDATIONS" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Positioning recommendations created (founder review)"); qc.invalidateQueries({ queryKey: ["competitor-positioning"] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setRunning(false),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competitor_learning_insights").update({ status: "approved" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Insight approved"); qc.invalidateQueries({ queryKey: ["competitor-positioning"] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
  });

  const Tile = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-competitor-positioning">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Target size={14} className="text-primary" /> Competitor Learning & Offer Positioning</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">
            <ShieldAlert size={10} className="mr-1" /> No external send · No claims published · Founder approval required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Competitors tracked" value={competitors.length} />
          <Tile label="New insights" value={insights.length} />
          <Tile label="Offer gaps" value={offerGaps.length} />
          <Tile label="Content gaps" value={contentGaps.length} />
          <Tile label="Proposal angles" value={proposalAngles.length} />
          <Tile label="Upsell ideas" value={upsellIdeas.length} />
          <Tile label="High-risk flags" value={riskFlagged.length} />
          <Tile label="Pending review" value={pending.length} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb size={12} /> Recommendations are internal only. No competitor claim is auto-published.
          </div>
          <Button size="sm" variant="outline" disabled={running} onClick={() => generate.mutate()}>
            <RefreshCw size={12} className={`mr-1 ${running ? "animate-spin" : ""}`} /> Generate positioning
          </Button>
        </div>

        <div>
          <div className="text-xs font-medium mb-1">Top insights</div>
          {insights.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No insights yet. Add competitor notes to begin.</p>
          ) : insights.slice(0, 8).map((i) => (
            <div key={i.id} className="flex items-start justify-between gap-2 border-b border-border/30 py-2">
              <div className="min-w-0">
                <div className="text-[12px] font-medium truncate">{i.insight_title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  <Badge variant="outline" className="mr-1 text-[10px]">{i.insight_type}</Badge>
                  <Badge variant="outline" className={`mr-1 text-[10px] ${i.risk_level === "high" ? "border-red-500/40 text-red-300" : i.risk_level === "low" ? "border-emerald-500/40 text-emerald-300" : "border-yellow-500/40 text-yellow-300"}`}>{i.risk_level}</Badge>
                  {i.insight_summary ?? i.recommended_offer_change ?? i.recommended_content_angle ?? i.recommended_sales_angle ?? i.recommended_response ?? ""}
                </div>
              </div>
              {i.status === "pending" ? (
                <Button size="sm" variant="outline" onClick={() => approve.mutate(i.id)}>Approve</Button>
              ) : (
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300">{i.status}</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}