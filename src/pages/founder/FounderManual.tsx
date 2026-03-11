import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, Search, FileText, Download, Layers, Bot, Workflow, Plug,
  Building2, Shield, LayoutTemplate, Rocket, Globe, Monitor, Activity,
  Command, Network, Zap, BarChart3, BookOpenCheck,
} from "lucide-react";
import { format } from "date-fns";

const SECTIONS = [
  { key: "Platform Architecture", icon: Layers },
  { key: "System Modules", icon: Monitor },
  { key: "Automation Systems", icon: Workflow },
  { key: "AI Agents", icon: Bot },
  { key: "Deployment Systems", icon: Rocket },
  { key: "Organisation Structure", icon: Building2 },
  { key: "Security & Compliance", icon: Shield },
  { key: "Template Library", icon: LayoutTemplate },
  { key: "Platform Expansion System", icon: Rocket },
  { key: "Knowledge Base", icon: BookOpen },
];

const FounderManual = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("manual");

  const { data: pages = [] } = useQuery({
    queryKey: ["manual-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("manual_pages").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["manual-versions"],
    queryFn: async () => {
      const { data } = await supabase.from("manual_versions").select("*").order("version_number", { ascending: false });
      return data ?? [];
    },
  });

  // Live data counts for the dashboard
  const { data: counts } = useQuery({
    queryKey: ["manual-live-counts"],
    queryFn: async () => {
      const [wf, ag, integ, org, dep, tmpl] = await Promise.all([
        supabase.from("automation_workflows").select("id", { count: "exact", head: true }),
        supabase.from("ai_agents").select("id", { count: "exact", head: true }),
        supabase.from("integrations").select("id", { count: "exact", head: true }),
        supabase.from("organisations").select("id", { count: "exact", head: true }),
        supabase.from("deployments").select("id", { count: "exact", head: true }),
        supabase.from("system_templates").select("id", { count: "exact", head: true }),
      ]);
      return {
        workflows: wf.count ?? 0,
        agents: ag.count ?? 0,
        integrations: integ.count ?? 0,
        organisations: org.count ?? 0,
        deployments: dep.count ?? 0,
        templates: tmpl.count ?? 0,
      };
    },
  });

  const filteredPages = pages.filter((p: any) =>
    !search ||
    p.module_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.section?.toLowerCase().includes(search.toLowerCase()) ||
    p.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedPages: Record<string, any[]> = {};
  filteredPages.forEach((p: any) => {
    if (!groupedPages[p.section]) groupedPages[p.section] = [];
    groupedPages[p.section].push(p);
  });

  const generateMarkdownExport = () => {
    let md = "# Liftor AI — Founder Manual\n\n";
    md += `Generated: ${format(new Date(), "MMMM d, yyyy HH:mm")}\n\n`;
    md += `## Platform Summary\n\n`;
    md += `- Modules Documented: ${pages.length}\n`;
    md += `- Workflows: ${counts?.workflows ?? 0}\n`;
    md += `- AI Agents: ${counts?.agents ?? 0}\n`;
    md += `- Integrations: ${counts?.integrations ?? 0}\n`;
    md += `- Organisations: ${counts?.organisations ?? 0}\n`;
    md += `- Deployments: ${counts?.deployments ?? 0}\n`;
    md += `- Templates: ${counts?.templates ?? 0}\n\n`;
    md += "---\n\n";

    SECTIONS.forEach((sec) => {
      const sectionPages = pages.filter((p: any) => p.section === sec.key);
      if (sectionPages.length === 0) return;
      md += `## ${sec.key}\n\n`;
      sectionPages.forEach((p: any) => {
        md += `### ${p.module_name}\n\n`;
        md += `**Purpose:** ${p.purpose || "—"}\n\n`;
        if (p.core_functions) md += `**Core Functions:** ${p.core_functions}\n\n`;
        if (p.user_roles) md += `**User Roles:** ${p.user_roles}\n\n`;
        if (p.connected_modules) md += `**Connected Modules:** ${p.connected_modules}\n\n`;
        if (p.data_inputs) md += `**Data Inputs:** ${p.data_inputs}\n\n`;
        if (p.data_outputs) md += `**Data Outputs:** ${p.data_outputs}\n\n`;
        if (p.operational_notes) md += `**Operational Notes:** ${p.operational_notes}\n\n`;
        md += "---\n\n";
      });
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor-ai-founder-manual-${format(new Date(), "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Manual exported as Markdown");
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpenCheck size={24} className="text-primary" /> Founder Manual
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Complete platform documentation — self-updating & exportable
            </p>
          </div>
          <Button variant="outline" onClick={generateMarkdownExport}>
            <Download size={16} className="mr-2" /> Export Manual
          </Button>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Modules", value: pages.length, icon: Layers },
            { label: "Workflows", value: counts?.workflows ?? 0, icon: Workflow },
            { label: "Agents", value: counts?.agents ?? 0, icon: Bot },
            { label: "Integrations", value: counts?.integrations ?? 0, icon: Plug },
            { label: "Organisations", value: counts?.organisations ?? 0, icon: Building2 },
            { label: "Deployments", value: counts?.deployments ?? 0, icon: Rocket },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-4">
                <s.icon size={16} className="text-primary mb-1" />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="manual">Documentation</TabsTrigger>
            <TabsTrigger value="versions">Version History</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search modules, sections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* Sections */}
            {SECTIONS.map((sec) => {
              const sectionPages = groupedPages[sec.key];
              if (!sectionPages || sectionPages.length === 0) return null;
              return (
                <Card key={sec.key} className="bg-card border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <sec.icon size={16} className="text-primary" /> {sec.key}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {sectionPages.map((p: any) => (
                        <Link
                          key={p.id}
                          to={`/founder/manual/${p.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                              {p.module_name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {p.purpose || "—"}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            v{p.version} · {format(new Date(p.updated_at), "MMM d")}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="versions" className="space-y-4 mt-4">
            {versions.length === 0 ? (
              <Card className="bg-card border-border/50">
                <CardContent className="p-6 text-muted-foreground text-sm">
                  No version history yet. Versions are created when manual pages are updated.
                </CardContent>
              </Card>
            ) : (
              versions.map((v: any) => (
                <Card key={v.id} className="bg-card border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Version {v.version_number}</p>
                      <p className="text-xs text-muted-foreground">{v.summary}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
};

export default FounderManual;
