import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LearningOptimisationEnginePanel from "@/components/founder/optimisation/LearningOptimisationEnginePanel";
import PortfolioIntelligenceBrainPanel from "@/components/founder/strategy/PortfolioIntelligenceBrainPanel";
import GlobalAIBrainCommandCentre from "@/components/founder/command/GlobalAIBrainCommandCentre";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Compass, TrendingUp, BarChart3, Building2, Lightbulb, Bookmark, Plus, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

const insightCategories = [
  { value: "market_signal", label: "Market Signals", icon: TrendingUp },
  { value: "automation_demand", label: "Automation Demand", icon: BarChart3 },
  { value: "venture_opportunity", label: "Venture Opportunities", icon: Sparkles },
  { value: "industry_indicator", label: "Industry Indicators", icon: Building2 },
  { value: "template_performance", label: "Template Performance", icon: Lightbulb },
  { value: "expansion", label: "Platform Expansion", icon: Compass },
];

const confidenceColor = (c: string) => {
  if (c === "high") return "default" as const;
  if (c === "medium") return "secondary" as const;
  return "outline" as const;
};

const StrategyEngine = () => {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: insights, refetch } = useQuery({
    queryKey: ["strategy-insights"],
    queryFn: async () => {
      const { data } = await supabase
        .from("strategy_insights")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Platform signal counts
  const { data: templates } = useQuery({
    queryKey: ["strategy-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("system_templates").select("id, usage_count, template_type");
      return data || [];
    },
  });

  const { data: orgs } = useQuery({
    queryKey: ["strategy-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("id, industry");
      return data || [];
    },
  });

  const { data: workflows } = useQuery({
    queryKey: ["strategy-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("id, automation_type, execution_count");
      return data || [];
    },
  });

  const { data: platforms } = useQuery({
    queryKey: ["strategy-platforms"],
    queryFn: async () => {
      const { data } = await supabase.from("launched_platforms").select("id, industry, status");
      return data || [];
    },
  });

  const pending = insights?.filter((i) => i.status === "pending") || [];
  const saved = insights?.filter((i) => i.status === "saved") || [];
  const dismissed = insights?.filter((i) => i.status === "dismissed") || [];

  // Industry breakdown
  const industryMap = new Map<string, number>();
  orgs?.forEach((o) => { if (o.industry) industryMap.set(o.industry, (industryMap.get(o.industry) || 0) + 1); });
  platforms?.forEach((p) => { if (p.industry) industryMap.set(p.industry, (industryMap.get(p.industry) || 0) + 1); });
  const topIndustries = [...industryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Automation type breakdown
  const autoMap = new Map<string, number>();
  workflows?.forEach((w) => { autoMap.set(w.automation_type, (autoMap.get(w.automation_type) || 0) + (w.execution_count || 1)); });
  const topAuto = [...autoMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top templates
  const topTemplates = [...(templates || [])].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 5);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("strategy_insights").insert({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      category: fd.get("category") as string,
      confidence_level: fd.get("confidence_level") as string,
      target_industry: fd.get("target_industry") as string,
    });
    if (error) { toast.error("Failed to create insight"); return; }
    toast.success("Strategic insight created");
    setCreateOpen(false);
    refetch();
  };

  const handleAction = async (id: string, status: string) => {
    const { error } = await supabase.from("strategy_insights").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Insight ${status}`);
    refetch();
  };

  const InsightCard = ({ insight }: { insight: any }) => (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium">{insight.title}</p>
              <Badge variant={confidenceColor(insight.confidence_level)}>{insight.confidence_level} confidence</Badge>
              <Badge variant="outline">{insight.category.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
            {insight.target_industry && <p className="text-xs text-muted-foreground mt-1">Industry: {insight.target_industry}</p>}
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(insight.created_at), "dd MMM yyyy HH:mm")}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {insight.status === "pending" && (
              <>
                <Button size="sm" variant="default" onClick={() => handleAction(insight.id, "saved")}>
                  <Bookmark size={14} className="mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleAction(insight.id, "dismissed")}>Dismiss</Button>
              </>
            )}
            {insight.status !== "pending" && (
              <Badge variant="secondary" className="capitalize">{insight.status}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <FounderLayout>
      <div className="space-y-8">
        <GlobalAIBrainCommandCentre />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Compass className="text-primary" size={32} />
              AI Strategy Engine
            </h1>
            <p className="text-muted-foreground mt-1">Strategic growth intelligence & opportunity detection</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" /> New Insight</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Strategic Insight</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input name="title" placeholder="Insight title" required />
                <Textarea name="description" placeholder="Description" />
                <Select name="category" defaultValue="market_signal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {insightCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input name="target_industry" placeholder="Target industry" />
                <Select name="confidence_level" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Market Signals</p>
                  <p className="text-3xl font-bold">{insights?.filter((i) => i.category === "market_signal").length || 0}</p>
                </div>
                <TrendingUp className="text-primary" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Venture Ideas</p>
                  <p className="text-3xl font-bold">{insights?.filter((i) => i.category === "venture_opportunity").length || 0}</p>
                </div>
                <Sparkles className="text-primary" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Industries Tracked</p>
                  <p className="text-3xl font-bold">{industryMap.size}</p>
                </div>
                <Building2 className="text-primary" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-3xl font-bold">{pending.length}</p>
                </div>
                <Lightbulb className="text-primary" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Intelligence Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top Industries</CardTitle></CardHeader>
            <CardContent>
              {topIndustries.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
              <div className="space-y-2">
                {topIndustries.map(([industry, count]) => (
                  <div key={industry} className="flex justify-between items-center p-2 rounded-lg bg-secondary/50">
                    <span className="text-sm">{industry}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Automation Demand</CardTitle></CardHeader>
            <CardContent>
              {topAuto.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
              <div className="space-y-2">
                {topAuto.map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-2 rounded-lg bg-secondary/50">
                    <span className="text-sm capitalize">{type}</span>
                    <Badge variant="secondary">{count} exec</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Top Templates</CardTitle></CardHeader>
            <CardContent>
              {topTemplates.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
              <div className="space-y-2">
                {topTemplates.map((t) => (
                  <div key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-secondary/50">
                    <span className="text-sm">{t.template_type}</span>
                    <Badge variant="secondary">{t.usage_count} uses</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="saved">Saved ({saved.length})</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed ({dismissed.length})</TabsTrigger>
            <TabsTrigger value="all">All History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 && <p className="text-muted-foreground text-sm">No pending insights.</p>}
            {pending.map((i) => <InsightCard key={i.id} insight={i} />)}
          </TabsContent>
          <TabsContent value="saved" className="space-y-3 mt-4">
            {saved.length === 0 && <p className="text-muted-foreground text-sm">No saved insights.</p>}
            {saved.map((i) => <InsightCard key={i.id} insight={i} />)}
          </TabsContent>
          <TabsContent value="dismissed" className="space-y-3 mt-4">
            {dismissed.length === 0 && <p className="text-muted-foreground text-sm">No dismissed insights.</p>}
            {dismissed.map((i) => <InsightCard key={i.id} insight={i} />)}
          </TabsContent>
          <TabsContent value="all" className="space-y-3 mt-4">
            {insights?.length === 0 && <p className="text-muted-foreground text-sm">No insights yet.</p>}
            {insights?.map((i) => <InsightCard key={i.id} insight={i} />)}
          </TabsContent>
        </Tabs>
        <PortfolioIntelligenceBrainPanel />
        <LearningOptimisationEnginePanel />
        <SocialMediaBrainPanel />
      </div>
    </FounderLayout>
  );
};

export default StrategyEngine;
