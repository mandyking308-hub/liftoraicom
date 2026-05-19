import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShieldCheck, Lock } from "lucide-react";

export default function CustomerSuccessCommandCentreBlock() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    supabase.functions.invoke("customer-success-healthcheck", { body: {} }).then(({ data }) => setData(data));
  }, []);
  const tile = (label: string, v: any) => (
    <div className="p-2 rounded bg-secondary/40 text-xs">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{v ?? "—"}</p>
    </div>
  );
  const nextAction = (() => {
    if (!data) return "Loading…";
    if ((data.onboarding_needing_review ?? 0) > 0) return "Review onboarding plans";
    if ((data.bedding_reviews_due ?? 0) > 0) return "Run bedding-in reviews";
    if ((data.checkins_due ?? 0) > 0) return "Run customer success check-ins";
    if ((data.high_risk_customers ?? 0) > 0) return "Address high-risk customers";
    if ((data.renewals_due_60d ?? 0) > 0) return "Prepare renewal reviews";
    if ((data.quarterly_reports_needing_review ?? 0) > 0) return "Review quarterly reports";
    if ((data.success_profiles_total ?? 0) === 0) return "Create your first customer success profile";
    return "All clear — keep manual exports up to date.";
  })();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Users size={16} /> Customer Success / Portal / Retention
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={10} className="mr-1" /> Internal only · No send · No invite · No charge
          </Badge>
        </CardTitle>
        <div className="flex gap-1">
          <Link to="/founder/customer-success"><Button size="sm" variant="outline" className="h-7 text-xs">Open</Button></Link>
          <Link to="/founder/clients"><Button size="sm" variant="outline" className="h-7 text-xs">Portals</Button></Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {tile("Profiles", data?.success_profiles_total)}
          {tile("Onboarding review", data?.onboarding_needing_review)}
          {tile("Welcome packs", data?.welcome_packs_total)}
          {tile("Portal blueprints", data?.portal_blueprints_total)}
          {tile("Portal content", data?.portal_content_packs_total)}
          {tile("Bedding due", data?.bedding_reviews_due)}
          {tile("Check-ins due", data?.checkins_due)}
          {tile("Surveys awaiting", data?.surveys_draft_total)}
          {tile("QR review", data?.quarterly_reports_needing_review)}
          {tile("Renewals 60d", data?.renewals_due_60d)}
          {tile("High risk", data?.high_risk_customers)}
          {tile("Upsells", data?.upsell_opportunities_total)}
          {tile("Win-backs", data?.winback_plans_total)}
          {tile("Manual exports", data?.manual_exports_total)}
          {tile("Msgs sent", data?.customer_messages_sent_total ?? 0)}
          {tile("Portal accts", data?.portal_accounts_created_total ?? 0)}
          {tile("Invites sent", data?.portal_invites_sent_total ?? 0)}
          {tile("Surveys sent", data?.surveys_sent_total ?? 0)}
          {tile("Reports shared", data?.reports_shared_total ?? 0)}
          {tile("Payments", data?.payments_created_total ?? 0)}
          {tile("Subs changed", data?.subscriptions_changed_total ?? 0)}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck size={14} className="text-green-400" />
          <span className="text-muted-foreground">Next:</span>
          <span className="font-semibold">{nextAction}</span>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {[
            ["Create profile","/founder/customer-success"],
            ["Onboarding plan","/founder/customer-success"],
            ["Welcome pack","/founder/customer-success"],
            ["Portal blueprint","/founder/clients"],
            ["Bedding-in","/founder/customer-success"],
            ["Check-in","/founder/customer-success"],
            ["Survey draft","/founder/customer-success"],
            ["Quarterly report","/founder/customer-success"],
            ["Renewal review","/founder/customer-success"],
            ["Retention risk","/founder/customer-success"],
            ["Manual export","/founder/customer-success"],
            ["Purge test data","/founder/customer-success"],
          ].map(([label, href]) => (
            <Link key={label} to={href}><Button size="sm" variant="ghost" className="h-6 text-[10px]">{label}</Button></Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}