import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight } from "lucide-react";

type Row = {
  id: string;
  name: string;
  status: "active" | "watch" | "setup_needed" | "paused";
  spendToday: number;
  approvals: number;
  alerts: number;
  outreach: string;
  crm: string;
  social: string;
  sales: string;
  revenue: number;
  nextAction: string;
};

const statusCls: Record<Row["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  watch: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  setup_needed: "bg-muted text-muted-foreground border-border/60",
  paused: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function BusinessOperatingStatus() {
  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ["cc-business-operating-status-v1"],
    refetchInterval: 60000,
    queryFn: async () => {
      const sb: any = supabase as any;
      const { data: businesses } = await sb.from("businesses").select("id,name,status");
      if (!businesses?.length) return [];
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [ledger, approvals, alerts, queue, contacts, social, deals, calls, closes] = await Promise.all([
        sb.from("ai_usage_ledger").select("business_id,cost_usd").gte("created_at", since),
        sb.from("founder_approval_items").select("business_id").eq("status", "pending"),
        sb.from("system_events").select("business_name").eq("resolved", false).in("severity", ["critical", "high"]),
        sb.from("email_queue").select("business_name,status"),
        sb.from("contacts").select("assigned_business,status,intent_score").neq("status", "INTERNAL"),
        sb.from("social_post_drafts").select("business_id,approval_status"),
        sb.from("deals").select("business_name,estimated_value_max,status"),
        sb.from("customer_sales_call_logs").select("business_id,started_at").gte("started_at", since),
        sb.from("customer_sales_close_actions").select("business_id,action_status"),
      ].map((p) => p.catch(() => ({ data: [] }))));

      return (businesses as any[]).map((b) => {
        const spend = (ledger.data ?? []).filter((l: any) => l.business_id === b.id)
          .reduce((s: number, l: any) => s + Number(l.cost_usd ?? 0), 0);
        const appr = (approvals.data ?? []).filter((a: any) => a.business_id === b.id).length;
        const alertsN = (alerts.data ?? []).filter((a: any) => a.business_name === b.name).length;
        const bQueue = (queue.data ?? []).filter((q: any) => q.business_name === b.name);
        const blocked = bQueue.filter((q: any) => q.status === "blocked").length;
        const failed = bQueue.filter((q: any) => q.status === "failed").length;
        const bContacts = (contacts.data ?? []).filter((c: any) => c.assigned_business === b.name);
        const warm = bContacts.filter((c: any) => (c.intent_score ?? 0) >= 60).length;
        const bSocial = (social.data ?? []).filter((s: any) => s.business_id === b.id);
        const socialPending = bSocial.filter((s: any) => ["pending", "needs_review"].includes(s.approval_status)).length;
        const bDeals = (deals.data ?? []).filter((d: any) => d.business_name === b.name);
        const revenue = bDeals.reduce((s: number, d: any) => s + Number(d.estimated_value_max ?? 0), 0);
        const bCalls = (calls.data ?? []).filter((c: any) => c.business_id === b.id).length;
        const bCloseApprovals = (closes.data ?? []).filter((c: any) => c.business_id === b.id && c.action_status === "approval_required").length;
        const salesStr = bCalls === 0 && bCloseApprovals === 0
          ? "no sales activity"
          : `${bCalls} calls today · ${bCloseApprovals} close awaiting`;

        let status: Row["status"] = "setup_needed";
        if (b.status === "paused") status = "paused";
        else if (failed > 0 || alertsN > 0) status = "watch";
        else if (bContacts.length > 0 || bDeals.length > 0) status = "active";

        let nextAction = "Configure business in onboarding factory";
        if (status === "paused") nextAction = "Unpause or archive this business";
        else if (failed > 0) nextAction = `Investigate ${failed} failed send${failed === 1 ? "" : "s"}`;
        else if (appr > 0) nextAction = `Clear ${appr} pending approval${appr === 1 ? "" : "s"}`;
        else if (socialPending > 0) nextAction = `Review ${socialPending} social draft${socialPending === 1 ? "" : "s"}`;
        else if (blocked > 0) nextAction = `Review ${blocked} blocked outreach row${blocked === 1 ? "" : "s"}`;
        else if (warm > 0) nextAction = `Engage ${warm} warm lead${warm === 1 ? "" : "s"}`;
        else if (bCloseApprovals > 0) nextAction = `Review ${bCloseApprovals} sales close action(s)`;
        else if (bContacts.length === 0) nextAction = "Import or onboard initial leads";

        return {
          id: b.id,
          name: b.name,
          status,
          spendToday: Math.round(spend * 10000) / 10000,
          approvals: appr,
          alerts: alertsN,
          outreach: bQueue.length === 0 ? "no queue" : `${blocked} blocked · ${failed} failed`,
          crm: `${bContacts.length} contacts · ${warm} warm`,
          social: bSocial.length === 0 ? "no drafts" : `${bSocial.length} drafts · ${socialPending} pending`,
          sales: salesStr,
          revenue,
          nextAction,
        };
      });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 size={14} className="text-primary" /> Business operating status
            <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No businesses configured yet. <Link to="/founder/business-onboarding-factory" className="text-primary hover:underline">Open onboarding factory →</Link></p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr className="border-b border-border/40">
                    <th className="text-left p-2">Business</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">AI $ today</th>
                    <th className="text-right p-2">Approvals</th>
                    <th className="text-right p-2">Alerts</th>
                    <th className="text-left p-2">Outreach</th>
                    <th className="text-left p-2">CRM</th>
                    <th className="text-left p-2">Social</th>
                    <th className="text-left p-2">Sales</th>
                    <th className="text-right p-2">Pipeline $</th>
                    <th className="text-left p-2">Recommended next action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/30">
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusCls[r.status]}`}>{r.status.replace("_", " ")}</Badge></td>
                      <td className="p-2 text-right font-mono">${r.spendToday.toFixed(4)}</td>
                      <td className="p-2 text-right">{r.approvals}</td>
                      <td className="p-2 text-right">{r.alerts}</td>
                      <td className="p-2 text-muted-foreground">{r.outreach}</td>
                      <td className="p-2 text-muted-foreground">{r.crm}</td>
                      <td className="p-2 text-muted-foreground">{r.social}</td>
                      <td className="p-2 text-muted-foreground">{r.sales}</td>
                      <td className="p-2 text-right font-mono">${r.revenue.toLocaleString()}</td>
                      <td className="p-2 text-primary/90 flex items-center gap-1">{r.nextAction} <ArrowRight size={10} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}