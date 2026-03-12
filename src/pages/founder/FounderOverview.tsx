import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileInput, FolderKanban, CheckCircle2, Activity, ArrowRight, Sparkles, Globe, Clock, Layers, PoundSterling, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)", "hsl(199, 89%, 48%)", "hsl(172, 66%, 50%)",
  "hsl(142, 71%, 45%)", "hsl(262, 83%, 58%)", "hsl(330, 81%, 60%)",
  "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)",
];

const FounderOverview = () => {
  const [stats, setStats] = useState({ proposals: 0, activeProjects: 0, nearCompletion: 0, recentActivity: 0 });
  const [proposals, setProposals] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [proposalsRes, projectsRes, activityRes] = await Promise.all([
        supabase.from("proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("*"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const allProposals = proposalsRes.data || [];
      const projects = projectsRes.data || [];
      const activities = activityRes.data || [];

      setStats({
        proposals: allProposals.length,
        activeProjects: projects.filter((p) => p.status === "active").length,
        nearCompletion: projects.filter((p) => p.current_stage === "Launch" || p.current_stage === "Testing").length,
        recentActivity: activities.length,
      });

      setProposals(allProposals);
      setRecentActivities(activities.slice(0, 8));
      setLoading(false);
    };
    load();
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const recentProposals = useMemo(() => proposals.slice(0, 5), [proposals]);

  const last30 = useMemo(() => proposals.filter((p) => new Date(p.created_at) >= thirtyDaysAgo), [proposals, thirtyDaysAgo]);

  const industryData = useMemo(() => {
    const counts: Record<string, number> = {};
    last30.forEach((p) => { counts[p.industry] = (counts[p.industry] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [last30]);

  const automationData = useMemo(() => {
    const counts: Record<string, number> = {};
    last30.forEach((p) => {
      (p.processes_to_automate || []).forEach((proc: string) => {
        counts[proc] = (counts[proc] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [last30]);

  const timelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    last30.forEach((p) => { counts[p.timeline] = (counts[p.timeline] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [last30]);

  const topTimeline = useMemo(() => {
    if (timelineData.length === 0) return "—";
    return timelineData.sort((a, b) => b.value - a.value)[0].name;
  }, [timelineData]);

  // Parse cost range midpoint from strings like "£85,000 – £140,000"
  const parseMidpoint = (range: string | null): number => {
    if (!range) return 0;
    const nums = range.match(/[\d,]+/g);
    if (!nums || nums.length < 2) return 0;
    const low = parseInt(nums[0].replace(/,/g, ""), 10);
    const high = parseInt(nums[1].replace(/,/g, ""), 10);
    return Math.round((low + high) / 2);
  };

  const totalPipelineValue = useMemo(() => {
    return proposals.reduce((sum, p) => sum + parseMidpoint(p.ai_estimated_cost_range), 0);
  }, [proposals]);

  const totalSavingsPotential = useMemo(() => {
    return proposals.reduce((sum, p) => sum + parseMidpoint(p.ai_estimated_annual_savings), 0);
  }, [proposals]);

  const avgRoiPeriod = useMemo(() => {
    const periods = proposals
      .map((p) => p.ai_estimated_roi_period as string | null)
      .filter(Boolean)
      .map((r) => parseMidpoint(r));
    if (periods.length === 0) return "—";
    const avg = periods.reduce((a, b) => a + b, 0) / periods.length;
    return `${Math.round(avg)} months`;
  }, [proposals]);

  const pipelineByIndustry = useMemo(() => {
    const map: Record<string, number> = {};
    proposals.forEach((p) => {
      const mid = parseMidpoint(p.ai_estimated_cost_range);
      if (mid > 0) map[p.industry] = (map[p.industry] || 0) + mid;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [proposals]);

  const savingsByIndustry = useMemo(() => {
    const map: Record<string, number> = {};
    proposals.forEach((p) => {
      const mid = parseMidpoint(p.ai_estimated_annual_savings);
      if (mid > 0) map[p.industry] = (map[p.industry] || 0) + mid;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [proposals]);

  return (
    <FounderLayout>
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Founder Console</h1>
          <p className="text-muted-foreground mt-1">Operational overview of Liftor AI</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {[
                { label: "Proposal Requests", value: stats.proposals, icon: FileInput, link: "/founder/proposals" },
                { label: "Active Projects", value: stats.activeProjects, icon: FolderKanban, link: "/founder/projects" },
                { label: "Near Completion", value: stats.nearCompletion, icon: CheckCircle2, link: "/founder/projects" },
                { label: "Recent Activity", value: stats.recentActivity, icon: Activity, link: "/founder/activity" },
              ].map((s) => (
                <Link key={s.label} to={s.link} className="p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <s.icon size={18} className="text-primary" />
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-3xl font-bold">{s.value}</p>
                </Link>
              ))}
            </div>

            {/* AI Proposal Intelligence */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  <h2 className="text-lg font-semibold">AI Proposal Intelligence</h2>
                </div>
                <Link to="/founder/proposals" className="text-sm text-primary hover:underline flex items-center gap-1">All Proposals <ArrowRight size={14} /></Link>
              </div>

              {/* Proposal metrics */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Last 30 Days</span>
                    </div>
                    <p className="text-2xl font-bold">{last30.length}</p>
                    <p className="text-xs text-muted-foreground">Proposals Generated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Industries</span>
                    </div>
                    <p className="text-2xl font-bold">{industryData.length}</p>
                    <p className="text-xs text-muted-foreground">Unique Industries</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Top Automation</span>
                    </div>
                    <p className="text-lg font-bold truncate">{automationData[0]?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">Most Requested</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Avg Timeline</span>
                    </div>
                    <p className="text-lg font-bold truncate">{topTimeline}</p>
                    <p className="text-xs text-muted-foreground">Most Common</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <PoundSterling size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Pipeline</span>
                    </div>
                    <p className="text-lg font-bold truncate">£{(totalPipelineValue / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">Total Pipeline Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-green-400" />
                      <span className="text-xs text-muted-foreground">Savings Potential</span>
                    </div>
                    <p className="text-lg font-bold truncate text-green-400">£{(totalSavingsPotential / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">Total Est. Annual Savings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Avg ROI Period</span>
                    </div>
                    <p className="text-lg font-bold truncate">{avgRoiPeriod}</p>
                    <p className="text-xs text-muted-foreground">Across All Proposals</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-primary" />
                      <span className="text-xs text-muted-foreground">Value Ratio</span>
                    </div>
                    <p className="text-lg font-bold truncate">
                      {totalPipelineValue > 0 ? `${(totalSavingsPotential / totalPipelineValue).toFixed(1)}x` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Savings vs Investment</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Proposals by Industry</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {industryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={industryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                            {industryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Automation Types Requested</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {automationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={automationData} layout="vertical" margin={{ left: 0, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pipeline Value by Industry</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pipelineByIndustry.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={pipelineByIndustry} layout="vertical" margin={{ left: 0, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value: number) => `£${(value / 1000).toFixed(0)}k`} />
                          <Bar dataKey="value" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent proposals table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Proposals</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentProposals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No proposals yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-4">Date</th>
                            <th className="pb-2 pr-4">Company</th>
                            <th className="pb-2 pr-4">Industry</th>
                            <th className="pb-2 pr-4">System Type</th>
                            <th className="pb-2 pr-4">Timeline</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentProposals.map((p) => (
                            <tr key={p.id} className="border-b border-border/50 last:border-0">
                              <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="py-3 pr-4 font-medium">{p.company_name}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{p.industry}</td>
                              <td className="py-3 pr-4 text-muted-foreground truncate max-w-[140px]">{p.project_types?.join(", ")}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{p.timeline}</td>
                              <td className="py-3 pr-4">
                                <span className="text-xs px-2 py-0.5 rounded-full capitalize bg-secondary text-muted-foreground">
                                  {(p.lead_status || p.status || "new").replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="py-3">
                                <Link to={`/founder/proposals/${p.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">
                                  View Proposal
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Activity feed */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Activity</h2>
                  <Link to="/founder/activity" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
                </div>
                {recentActivities.length === 0 ? (
                  <div className="p-6 rounded-xl border border-border/50 bg-card text-center text-muted-foreground text-sm">No activity yet.</div>
                ) : (
                  <div className="space-y-2">
                    {recentActivities.map((a) => (
                      <div key={a.id} className="p-4 rounded-xl border border-border/50 bg-card">
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </FounderLayout>
  );
};

export default FounderOverview;
