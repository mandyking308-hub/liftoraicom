import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Handshake, ClipboardCheck, UserCheck, FileLock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Counts = { reviewDue: number; prepareForSale: number; awaitingApproval: number; activeOffersOrDiligence: number; approachingReview: number; highFitBuyers: number; dataRoomBlockers: number };

/**
 * Founder-led exit attention. Founder/admin gated via RLS.
 * Surfaces only quiet, founder-actionable counters. No outreach. No alerts.
 */
export default function FounderLedExitAttentionPanel() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const todayPlus30 = new Date(); todayPlus30.setDate(todayPlus30.getDate() + 30);
        const [due, prep, await1, active, approaching, highFit, drBlockers] = await Promise.all([
          (supabase as any).from("founder_led_sale_reviews").select("id", { count: "exact", head: true }).eq("sale_review_status", "due"),
          (supabase as any).from("founder_led_sale_reviews").select("id", { count: "exact", head: true }).eq("sale_review_status", "prepare_for_sale"),
          (supabase as any).from("founder_led_buyer_targets").select("id", { count: "exact", head: true }).eq("outreach_status", "warm_path_identified").eq("founder_approved_to_contact", false),
          (supabase as any).from("founder_led_buyer_targets").select("id", { count: "exact", head: true }).in("outreach_status", ["offer", "diligence"]),
          (supabase as any).from("business_exit_intelligence_profiles").select("id", { count: "exact", head: true }).eq("sale_review_status", "not_due").lte("twelve_month_review_date", todayPlus30.toISOString().slice(0, 10)),
          (supabase as any).from("founder_led_buyer_targets").select("id", { count: "exact", head: true }).gte("fit_score", 70),
          (supabase as any).from("business_exit_intelligence_profiles").select("id", { count: "exact", head: true }).eq("sale_review_status", "prepare_for_sale").eq("data_room_open", false),
        ]);
        setC({
          reviewDue: due?.count ?? 0,
          prepareForSale: prep?.count ?? 0,
          awaitingApproval: await1?.count ?? 0,
          activeOffersOrDiligence: active?.count ?? 0,
          approachingReview: approaching?.count ?? 0,
          highFitBuyers: highFit?.count ?? 0,
          dataRoomBlockers: drBlockers?.count ?? 0,
        });
      } catch {
        /* founder/admin gated; silently skip */
      }
    })();
  }, []);

  const Item = ({ to, label, count, icon: Icon }: { to: string; label: string; count: number; icon: any }) => (
    <Link to={to} className="flex items-center justify-between border border-border/40 rounded p-3 hover:bg-secondary/40">
      <span className="flex items-center gap-2 text-xs">
        <Icon size={14} className="text-primary" />
        {label}
      </span>
      <Badge
        variant="outline"
        className={`text-[10px] ${count > 0 ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "text-muted-foreground"}`}
      >{count}</Badge>
    </Link>
  );

  return (
    <Card className="tech-card" id="sec-founder-led-exit-attention">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Handshake size={14} className="text-primary" />
          Founder-led exit — owner-led sale process
          <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">Founder decisions only · no outreach</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Item to="/founder/founder-led-exit" label="12-month sale review due" count={c?.reviewDue ?? 0} icon={ClipboardCheck} />
        <Item to="/founder/portfolio-exit/buyer-warmup" label="Approaching 12-month review" count={c?.approachingReview ?? 0} icon={ClipboardCheck} />
        <Item to="/founder/founder-led-exit" label="Marked prepare for sale" count={c?.prepareForSale ?? 0} icon={Handshake} />
        <Item to="/founder/founder-led-exit" label="Buyer outreach awaiting approval" count={c?.awaitingApproval ?? 0} icon={UserCheck} />
        <Item to="/founder/portfolio-exit/buyer-warmup" label="High-fit buyers identified" count={c?.highFitBuyers ?? 0} icon={UserCheck} />
        <Item to="/founder/portfolio-exit/buyer-warmup" label="Data room readiness blockers" count={c?.dataRoomBlockers ?? 0} icon={FileLock} />
        <Item to="/founder/founder-led-exit" label="Active offers / diligence" count={c?.activeOffersOrDiligence ?? 0} icon={FileLock} />
      </CardContent>
    </Card>
  );
}