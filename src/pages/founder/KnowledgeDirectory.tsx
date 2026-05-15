import KnowledgeSourceTruthPanel from "@/components/founder/knowledge/KnowledgeSourceTruthPanel";
import FounderLayout from "@/components/founder/FounderLayout";
import BusinessKnowledgeBrainPanel from "@/components/founder/knowledge/BusinessKnowledgeBrainPanel";
import SupportKnowledgeAgentPanel from "@/components/founder/support/SupportKnowledgeAgentPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import { BookOpen, Plus, Search, Layers, Bot, Workflow, Rocket, Lightbulb, FileText } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "System Architecture",
  "Automation Patterns",
  "AI Agent Design",
  "Workflow Optimisation",
  "Deployment Lessons",
  "General",
];

const ENTRY_TYPES = [
  { value: "knowledge", label: "Knowledge Entry" },
  { value: "workflow_template", label: "Workflow Template" },
  { value: "agent_pattern", label: "Agent Design Pattern" },
  { value: "lesson", label: "Lesson Learned" },
];

const categoryIcon = (c: string) => {
  if (c.includes("Architecture")) return <Layers size={16} />;
  if (c.includes("Agent")) return <Bot size={16} />;
  if (c.includes("Workflow") || c.includes("Automation")) return <Workflow size={16} />;
  if (c.includes("Deployment")) return <Rocket size={16} />;
  return <Lightbulb size={16} />;
};

const typeClass = (t: string) => {
  if (t === "workflow_template") return "bg-primary/20 text-primary";
  if (t === "agent_pattern") return "bg-green-500/20 text-green-400";
  if (t === "lesson") return "bg-yellow-500/20 text-yellow-400";
  return "bg-muted text-muted-foreground";
};

const KnowledgeDirectory = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "General", description: "", content: "", entry_type: "knowledge", related_system_name: "" });

  const { data: entries = [] } = useQuery({
    queryKey: ["knowledge-entries"],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_entries").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("knowledge_entries").insert({
        title: form.title,
        category: form.category,
        description: form.description,
        content: form.content,
        entry_type: form.entry_type,
        related_system_name: form.related_system_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-entries"] });
      setDialogOpen(false);
      setForm({ title: "", category: "General", description: "", content: "", entry_type: "knowledge", related_system_name: "" });
      toast.success("Knowledge entry created");
    },
    onError: () => toast.error("Failed to create entry"),
  });

  const filtered = entries.filter((e: any) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()) || e.related_system_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || e.category === filterCategory;
    const matchType = filterType === "all" || e.entry_type === filterType;
    return matchSearch && matchCat && matchType;
  });

  const grouped = CATEGORIES.reduce((acc: Record<string, any[]>, cat) => {
    const items = filtered.filter((e: any) => e.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground text-sm mt-1">Engineering knowledge, patterns, and operational insights</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={16} className="mr-2" /> New Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Knowledge Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.entry_type} onValueChange={v => setForm(f => ({ ...f, entry_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input placeholder="Related System (optional)" value={form.related_system_name} onChange={e => setForm(f => ({ ...f, related_system_name: e.target.value }))} />
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                <Textarea placeholder="Content / Details" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} />
                <Button onClick={() => createEntry.mutate()} disabled={!form.title || createEntry.isPending} className="w-full">Create Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <BusinessKnowledgeBrainPanel />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search knowledge base..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Entries", value: entries.length, icon: BookOpen },
            { label: "Workflow Templates", value: entries.filter((e: any) => e.entry_type === "workflow_template").length, icon: Workflow },
            { label: "Agent Patterns", value: entries.filter((e: any) => e.entry_type === "agent_pattern").length, icon: Bot },
            { label: "Lessons Learned", value: entries.filter((e: any) => e.entry_type === "lesson").length, icon: Lightbulb },
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

        {/* Grouped entries */}
        {Object.keys(grouped).length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <BookOpen size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No knowledge entries found. Create your first entry to get started.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat} className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">{categoryIcon(cat)} {cat}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(items as any[]).map((entry: any) => (
                    <Link key={entry.id} to={`/founder/knowledge/${entry.id}`}>
                      <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{entry.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {entry.related_system_name || "No linked system"} · Updated {format(new Date(entry.updated_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge variant="secondary" className={`text-xs ${typeClass(entry.entry_type)}`}>
                            {entry.entry_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {entry.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{entry.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <SupportKnowledgeAgentPanel />
        <KnowledgeSourceTruthPanel />
      </div>
    </FounderLayout>
  );
};

export default KnowledgeDirectory;
