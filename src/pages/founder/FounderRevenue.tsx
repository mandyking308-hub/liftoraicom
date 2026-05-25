import FounderLayout from "@/components/founder/FounderLayout";
import CostCreditsMarginControlPanel from "@/components/founder/finance/CostCreditsMarginControlPanel";
import FundingExitReadinessPanel from "@/components/founder/strategy/FundingExitReadinessPanel";
import PortfolioIntelligenceBrainPanel from "@/components/founder/strategy/PortfolioIntelligenceBrainPanel";
import CompetitorLearningPositioningPanel from "@/components/founder/strategy/CompetitorLearningPositioningPanel";
import HumanAccountManagerPanel from "@/components/founder/customer/HumanAccountManagerPanel";
import RetentionRecurringRevenuePanel from "@/components/founder/customer/RetentionRecurringRevenuePanel";
import TreasuryCashflowControlPanel from "@/components/founder/finance/TreasuryCashflowControlPanel";
import CRMTotalMemoryRecoveryPanel from "@/components/founder/customer/CRMTotalMemoryRecoveryPanel";
import PortfolioCommandCentrePanel from "@/components/founder/command/PortfolioCommandCentrePanel";
import { ProductisationReadinessPanel } from "@/components/founder/revenue/ProductisationReadinessPanel";
import CustomerSalesEngineCard from "@/components/founder/command/CustomerSalesEngineCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  PoundSterling, TrendingUp, FolderKanban, Users, Rocket, Handshake,
  Plus, Download, Search, Activity, Bot, Workflow, Building2, Monitor,
} from "lucide-react";

const fmt = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;

const dealStatusClass = (s: string) => {
  if (s === "confirmed") return "bg-green-500/20 text-green-400";
  if (s === "negotiation") return "bg-blue-500/20 text-blue-400";
  if (s === "proposal_sent") return "bg-purple-500/20 text-purple-400";
  if (s === "lead") return "bg-yellow-500/20 text-yellow-400";
  return "bg-muted text-muted-foreground";
};

const revenueStatusClass = (s: string) => {
  if (s === "confirmed") return "bg-green-500/20 text-green-400";
  if (s === "pending") return "bg-yellow-500/20 text-yellow-400";
  if (s === "invoiced") return "bg-blue-500/20 text-blue-400";
  return "bg-muted text-muted-foreground";
};

const DEAL_STATUSES = ["lead", "proposal_sent", "negotiation", "confirmed"];
const REVENUE_TYPES = ["project", "subscription", "partner", "venture"];
const REVENUE_STATUSES = ["confirmed", "pending", "invoiced"];

const FounderRevenue = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [revenueDialog, setRevenueDialog] = useState(false);
  const [dealDialog, setDealDialog] = useState(false);
  const [revenueForm, setRevenueForm] = useState({
    source_type: "project", source_name: "", client_organisation: "",
    revenue_value: "", status: "confirmed", notes: "",
  });
  const [dealForm, setDealForm] = useState({
    partner_name: "", client_organisation: "", project_name: "",
    project_value: "", partner_commission: "", deal_status: "lead",
  });

  // Queries
  const { data: revenue = [] } = useQuery({
    queryKey: ["revenue-records"],
    queryFn: async () => {
      const { data } = await supabase.from("revenue_records").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["partner-deals"],
    queryFn: async () => {
      const { data } = await supabase.from("partner_deals").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["revenue-live-counts"],
    queryFn: async () => {
      const [proj, subs, orgs, agents, wf, sys, ventures, opportunities, activity] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("organisations").select("id", { count: "exact", head: true }),
        supabase.from("ai_agents").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("automation_workflows").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("monitored_systems").select("id", { count: "exact", head: true }),
        supabase.from("launched_platforms").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("partner_opportunities").select("id", { count: "exact", head: true }),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      return {
        projects: proj.count ?? 0,
        subscriptions: subs.count ?? 0,
        organisations: orgs.count ?? 0,
        agents: agents.count ?? 0,
        workflows: wf.count ?? 0,
        systems: sys.count ?? 0,
        ventures: ventures.count ?? 0,
        opportunities: opportunities.count ?? 0,
        recentActivity: activity.data ?? [],
      };
    },
  });

  // Revenue calculations
  const projectRevenue = revenue.filter((r: any) => r.source_type === "project").reduce((sum: number, r: any) => sum + Number(r.revenue_value), 0);
  const subscriptionRevenue = revenue.filter((r: any) => r.source_type === "subscription").reduce((sum: number, r: any) => sum + Number(r.revenue_value), 0);
  const partnerRevenue = revenue.filter((r: any) => r.source_type === "partner").reduce((sum: number, r: any) => sum + Number(r.revenue_value), 0);
  const totalRevenue = revenue.reduce((sum: number, r: any) => sum + Number(r.revenue_value), 0);

  const handleAddRevenue = async () => {
    if (!revenueForm.source_name.trim()) { toast.error("Source name required"); return; }
    const { error } = await supabase.from("revenue_records").insert({
      ...revenueForm,
      revenue_value: parseFloat(revenueForm.revenue_value) || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Revenue record added");
    setRevenueForm({ source_type: "project", source_name: "", client_organisation: "", revenue_value: "", status: "confirmed", notes: "" });
    setRevenueDialog(false);
    qc.invalidateQueries({ queryKey: ["revenue-records"] });
  };

  const handleAddDeal = async () => {
    if (!dealForm.project_name.trim()) { toast.error("Project name required"); return; }
    const { error } = await supabase.from("partner_deals").insert({
      ...dealForm,
      project_value: parseFloat(dealForm.project_value) || 0,
      partner_commission: parseFloat(dealForm.partner_commission) || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Partner deal added");
    setDealForm({ partner_name: "", client_organisation: "", project_name: "", project_value: "", partner_commission: "", deal_status: "lead" });
    setDealDialog(false);
    qc.invalidateQueries({ queryKey: ["partner-deals"] });
  };

  const exportRevenueCSV = () => {
    const header = "Date,Source,Type,Client,Value,Currency,Status\n";
    const rows = revenue.map((r: any) =>
      `"${format(new Date(r.created_at), "yyyy-MM-dd")}","${r.source_name}","${r.source_type}","${r.client_organisation}","${r.revenue_value}","${r.currency}","${r.status}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `liftor-revenue-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Revenue exported");
  };

  const exportReportMarkdown = () => {
    let md = `# Liftor AI — Revenue & Business Report\n\nGenerated: ${format(new Date(), "MMMM d, yyyy HH:mm")}\n\n`;
    md += `## Revenue Summary\n\n`;
    md += `| Category | Amount |\n|---|---|\n`;
    md += `| Project Revenue | ${fmt(projectRevenue)} |\n`;
    md += `| Subscription Revenue | ${fmt(subscriptionRevenue)} |\n`;
    md += `| Partner Revenue | ${fmt(partnerRevenue)} |\n`;
    md += `| **Total Revenue** | **${fmt(totalRevenue)}** |\n\n`;
    md += `## Platform Activity\n\n`;
    md += `- Active Projects: ${counts?.projects ?? 0}\n`;
    md += `- Active Subscriptions: ${counts?.subscriptions ?? 0}\n`;
    md += `- Active Ventures: ${counts?.ventures ?? 0}\n`;
    md += `- Partner Opportunities: ${counts?.opportunities ?? 0}\n`;
    md += `- Client Organisations: ${counts?.organisations ?? 0}\n`;
    md += `- Active Systems: ${counts?.systems ?? 0}\n`;
    md += `- Active Agents: ${counts?.agents ?? 0}\n`;
    md += `- Active Workflows: ${counts?.workflows ?? 0}\n\n`;
    md += `## Revenue Records\n\n`;
    revenue.forEach((r: any) => {
      md += `- **${r.source_name}** (${r.source_type}) — ${fmt(Number(r.revenue_value))} — ${r.client_organisation} — ${r.status}\n`;
    });
    md += `\n## Partner Deals\n\n`;
    deals.forEach((d: any) => {
      md += `- **${d.project_name}** — Partner: ${d.partner_name} — Value: ${fmt(Number(d.project_value))} — Commission: ${fmt(Number(d.partner_commission))} — ${d.deal_status}\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `liftor-business-report-${format(new Date(), "yyyy-MM-dd")}.md`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PoundSterling size={24} className="text-primary" /> Revenue & Business Console
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Complete commercial overview of Liftor AI</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRevenueCSV}><Download size={16} className="mr-2" /> CSV</Button>
            <Button variant="outline" onClick={exportReportMarkdown}><Download size={16} className="mr-2" /> Report</Button>
          </div>
        </div>

        <PortfolioIntelligenceBrainPanel />
        <CompetitorLearningPositioningPanel />
        <HumanAccountManagerPanel />
        <RetentionRecurringRevenuePanel />
        <CRMTotalMemoryRecoveryPanel />
        <TreasuryCashflowControlPanel />

        <PortfolioCommandCentrePanel />
        <ProductisationReadinessPanel />

        {/* Top-level metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Revenue", value: fmt(totalRevenue), icon: PoundSterling },
            { label: "Active Projects", value: counts?.projects ?? 0, icon: FolderKanban },
            { label: "Subscriptions", value: counts?.subscriptions ?? 0, icon: TrendingUp },
            { label: "Active Ventures", value: counts?.ventures ?? 0, icon: Rocket },
            { label: "Partner Opportunities", value: counts?.opportunities ?? 0, icon: Handshake },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <s.icon size={18} className="text-primary mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Revenue</TabsTrigger>
            <TabsTrigger value="partners">Partner Deals</TabsTrigger>
            <TabsTrigger value="platform">Platform Activity</TabsTrigger>
            <TabsTrigger value="feed">Activity Feed</TabsTrigger>
          </TabsList>

          {/* REVENUE TAB */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <CustomerSalesEngineCard />
            {/* Revenue breakdown */}
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { label: "Project Revenue", value: projectRevenue },
                { label: "Subscription Revenue", value: subscriptionRevenue },
                { label: "Partner Revenue", value: partnerRevenue },
                { label: "Total Platform Revenue", value: totalRevenue },
              ].map(s => (
                <Card key={s.label} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold mt-1">{fmt(s.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Revenue Records</h2>
              <Dialog open={revenueDialog} onOpenChange={setRevenueDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Revenue</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Revenue Record</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Source Name *</Label><Input value={revenueForm.source_name} onChange={e => setRevenueForm(p => ({ ...p, source_name: e.target.value }))} placeholder="AI Investment Platform" /></div>
                    <div>
                      <Label>Source Type</Label>
                      <Select value={revenueForm.source_type} onValueChange={v => setRevenueForm(p => ({ ...p, source_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{REVENUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Client Organisation</Label><Input value={revenueForm.client_organisation} onChange={e => setRevenueForm(p => ({ ...p, client_organisation: e.target.value }))} /></div>
                    <div><Label>Revenue Value (£)</Label><Input type="number" value={revenueForm.revenue_value} onChange={e => setRevenueForm(p => ({ ...p, revenue_value: e.target.value }))} /></div>
                    <div>
                      <Label>Status</Label>
                      <Select value={revenueForm.status} onValueChange={v => setRevenueForm(p => ({ ...p, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{REVENUE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Notes</Label><Textarea value={revenueForm.notes} onChange={e => setRevenueForm(p => ({ ...p, notes: e.target.value }))} /></div>
                    <Button onClick={handleAddRevenue} className="w-full">Add Record</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {revenue.length === 0 ? (
                <Card className="bg-card border-border/50"><CardContent className="p-6 text-muted-foreground text-sm">No revenue records yet.</CardContent></Card>
              ) : revenue.map((r: any) => (
                <Card key={r.id} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-sm">{r.source_name}</p>
                          <Badge variant="secondary" className={`text-xs ${revenueStatusClass(r.status)}`}>{r.status}</Badge>
                          <Badge variant="outline" className="text-xs">{r.source_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.client_organisation || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{fmt(Number(r.revenue_value))}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PARTNER DEALS TAB */}
          <TabsContent value="partners" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Partner Deals</h2>
              <Dialog open={dealDialog} onOpenChange={setDealDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Deal</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Partner Deal</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Partner Name</Label><Input value={dealForm.partner_name} onChange={e => setDealForm(p => ({ ...p, partner_name: e.target.value }))} /></div>
                    <div><Label>Client Organisation</Label><Input value={dealForm.client_organisation} onChange={e => setDealForm(p => ({ ...p, client_organisation: e.target.value }))} /></div>
                    <div><Label>Project Name *</Label><Input value={dealForm.project_name} onChange={e => setDealForm(p => ({ ...p, project_name: e.target.value }))} /></div>
                    <div><Label>Project Value (£)</Label><Input type="number" value={dealForm.project_value} onChange={e => setDealForm(p => ({ ...p, project_value: e.target.value }))} /></div>
                    <div><Label>Partner Commission (£)</Label><Input type="number" value={dealForm.partner_commission} onChange={e => setDealForm(p => ({ ...p, partner_commission: e.target.value }))} /></div>
                    <div>
                      <Label>Deal Status</Label>
                      <Select value={dealForm.deal_status} onValueChange={v => setDealForm(p => ({ ...p, deal_status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DEAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddDeal} className="w-full">Add Deal</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Pipeline view */}
            <div className="grid sm:grid-cols-4 gap-4">
              {DEAL_STATUSES.map(status => {
                const statusDeals = deals.filter((d: any) => d.deal_status === status);
                const totalValue = statusDeals.reduce((sum: number, d: any) => sum + Number(d.project_value), 0);
                return (
                  <Card key={status} className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize">{status.replace(/_/g, " ")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold">{statusDeals.length} deals</p>
                      <p className="text-xs text-muted-foreground">{fmt(totalValue)} total</p>
                      <div className="mt-3 space-y-2">
                        {statusDeals.map((d: any) => (
                          <div key={d.id} className="p-2 rounded bg-secondary/50 text-xs">
                            <p className="font-medium">{d.project_name}</p>
                            <p className="text-muted-foreground">{d.client_organisation} · {fmt(Number(d.project_value))}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Full deal list */}
            <div className="space-y-2">
              {deals.map((d: any) => (
                <Card key={d.id} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-sm">{d.project_name}</p>
                          <Badge variant="secondary" className={`text-xs ${dealStatusClass(d.deal_status)}`}>{d.deal_status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Partner: {d.partner_name || "—"} · Client: {d.client_organisation || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{fmt(Number(d.project_value))}</p>
                        <p className="text-xs text-muted-foreground">Commission: {fmt(Number(d.partner_commission))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PLATFORM ACTIVITY TAB */}
          <TabsContent value="platform" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Platform Usage Indicators</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Systems", value: counts?.systems ?? 0, icon: Monitor },
                { label: "Automations Running", value: counts?.workflows ?? 0, icon: Workflow },
                { label: "AI Agents Active", value: counts?.agents ?? 0, icon: Bot },
                { label: "Client Organisations", value: counts?.organisations ?? 0, icon: Building2 },
              ].map(s => (
                <Card key={s.label} className="bg-card border-border/50">
                  <CardContent className="p-5">
                    <s.icon size={18} className="text-primary mb-2" />
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h2 className="text-lg font-semibold mt-6">Active Ventures</h2>
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{counts?.ventures ?? 0} active ventures launched via Platform Expansion Manager</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIVITY FEED TAB */}
          <TabsContent value="feed" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Business Activity Feed</h2>
            <div className="space-y-2">
              {(counts?.recentActivity ?? []).length === 0 ? (
                <Card className="bg-card border-border/50"><CardContent className="p-6 text-muted-foreground text-sm">No recent activity.</CardContent></Card>
              ) : (counts?.recentActivity ?? []).map((a: any) => (
                <Card key={a.id} className="bg-card border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity size={14} className="text-primary" />
                      <div>
                        <p className="text-sm font-medium">{a.description}</p>
                        <p className="text-xs text-muted-foreground">{a.event_type}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy HH:mm")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <div className="max-w-7xl mx-auto px-4 pb-6"><CostCreditsMarginControlPanel /></div>
      <div className="max-w-7xl mx-auto px-4 pb-6"><FundingExitReadinessPanel /></div>
    </FounderLayout>
  );
};

export default FounderRevenue;
