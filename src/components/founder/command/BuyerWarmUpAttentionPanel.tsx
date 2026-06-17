import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Flame, UserCheck, ClipboardCheck, FileLock, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Counts = {
  warming: number;
  awaitingApproval: number;
  approachingReview: number;
  saleConversationReady: number;
  dataRoomBlockers: number;
};

/**
 * Buyer Warm-Up attention. Founder/admin gated via RLS.
 * Quiet counters only. No outreach. No alerts. No automation.
 */
export default function BuyerWarmUpAttentionPanel() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const todayPlus30 = new Date();
        todayPlus30.setDate(todayPlus30.getDate() + 30);
        const [warming, awaiting, approaching, ready, drBlockers] = await Promise.all([
          (supabase as any).from("founder_led_buyer_targets").select("id", { count: "exact", head: true })
            .in("warm_up_status", ["content_touchpoint_planned", "intro_path_identified", "draft_ready", "contacted", "replied", "meeting_booked"]),
          (supabase as any).from("founder_led_buyer_targets").select("id", { count: "exact", head: true })
            .eq("warm_up_status", "draft_ready").eq("founder_approved_to_contact", false),
          (supabase as any).from("business_exit_intelligence_profiles").select("id", { count: "exact", head: true })
            .eq("sale_review_status", "not_due").lte("twelve_month_review_date", todayPlus30.toISOString().slice(0, 10)),
          (supabase as any).from("founder_led_buyer_targets").select("id", { count: "exact", head: true })
            .eq("warm_up_status", "sale_conversation_ready"),
          (supabase as any).from("business_exit_intelligence_profiles").select("id", { count: "exact", head: true })
            .eq("sale_review_status", "prepare_for_sale").eq("data_room_open", false),
        ]);
        setC({
          warming: warming?.count ?? 0,
          awaitingApproval: awaiting?.count ?? 0,
          approachingReview: approaching?.count ?? 0,
          saleConversationReady: ready?.count ?? 0,
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
    <Card className="tech-card" id="sec-buyer-warm-up-attention">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flame size={14} className="text-primary" />
          Buyer warm-up — owner-led relationship preparation
          <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">Founder approval gates all contact</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
        <Item to="/founder/portfolio-exit/buyer-warmup" label="Buyers warming up" count={c?.warming ?? 0} icon={Flame} />
        <Item to="/founder/portfolio-exit/buyer-warmup" label="Buyers awaiting founder approval" count={c?.awaitingApproval ?? 0} icon={UserCheck} />
        <Item to="/founder/founder-led-exit" label="Approaching 12-month sale review" count={c?.approachingReview ?? 0} icon={ClipboardCheck} />
        <Item to="/founder/founder-led-exit" label="Sale conversations ready" count={c?.saleConversationReady ?? 0} icon={Handshake} />
        <Item to="/founder/portfolio-exit/buyer-warmup" label="Data room blockers before contact" count={c?.dataRoomBlockers ?? 0} icon={FileLock} />
      </CardContent>
    </Card>
  );
}