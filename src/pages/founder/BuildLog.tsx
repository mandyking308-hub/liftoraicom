import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Search, Plus, Download } from "lucide-react";
import { format } from "date-fns";

const CHANGE_TYPES = [
  "feature_added", "module_created", "module_updated", "bug_fixed",
  "integration_added", "workflow_created", "agent_created",
  "system_deployment", "template_created",
];

const changeTypeClass = (t: string) => {
  if (t.includes("created") || t === "feature_added") return "bg-green-500/20 text-green-400";
  if (t.includes("updated")) return "bg-blue-500/20 text-blue-400";
  if (t === "bug_fixed") return "bg-yellow-500/20 text-yellow-400";
  if (t === "system_deployment") return "bg-purple-500/20 text-purple-400";
  return "bg-muted text-muted-foreground";
};

const BuildLog = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", module_affected: "", change_type: "feature_added", author: "Liftor AI",
  });

  const { data: entries = [], refetch } = useQuery({
    queryKey: ["build-log"],
    queryFn: async () => {
      const { data } = await supabase.from("build_log_entries").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("build_log_entries").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Build log entry added");
    setForm({ title: "", description: "", module_affected: "", change_type: "feature_added", author: "Liftor AI" });
    setDialogOpen(false);
    refetch();
  };

  const filtered = entries.filter((e: any) => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.module_affected?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || e.change_type === filterType;
    return matchSearch && matchType;
  });

  const exportCSV = () => {
    const header = "Date,Title,Module,Change Type,Author,Description\n";
    const rows = entries.map((e: any) =>
      `"${format(new Date(e.created_at), "yyyy-MM-dd HH:mm")}","${e.title}","${e.module_affected}","${e.change_type}","${e.author}","${(e.description || "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor-build-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Build log exported as CSV");
  };

  const exportMarkdown = () => {
    let md = "# Liftor AI — Platform Build Log\n\n";
    md += `Generated: ${format(new Date(), "MMMM d, yyyy HH:mm")}\n\n`;
    md += `Total entries: ${entries.length}\n\n---\n\n`;
    entries.forEach((e: any) => {
      md += `### ${e.title}\n\n`;
      md += `- **Date:** ${format(new Date(e.created_at), "MMMM d, yyyy HH:mm")}\n`;
      md += `- **Module:** ${e.module_affected || "—"}\n`;
      md += `- **Type:** ${e.change_type}\n`;
      md += `- **Author:** ${e.author}\n\n`;
      if (e.description) md += `${e.description}\n\n`;
      md += "---\n\n";
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor-build-log-${format(new Date(), "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Build log exported as Markdown");
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList size={24} className="text-primary" /> Platform Build Log
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Append-only engineering history — {entries.length} entries
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus size={16} className="mr-2" /> Log Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Build Log Entry</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div><Label>Module Affected</Label><Input value={form.module_affected} onChange={(e) => setForm((p) => ({ ...p, module_affected: e.target.value }))} /></div>
                  <div>
                    <Label>Change Type</Label>
                    <Select value={form.change_type} onValueChange={(v) => setForm((p) => ({ ...p, change_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CHANGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <Button onClick={handleCreate} className="w-full">Add Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={exportCSV}><Download size={16} className="mr-2" /> CSV</Button>
            <Button variant="outline" onClick={exportMarkdown}><Download size={16} className="mr-2" /> MD</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CHANGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="p-6 text-muted-foreground text-sm">No build log entries found.</CardContent>
            </Card>
          ) : filtered.map((e: any) => (
            <Card key={e.id} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-sm">{e.title}</p>
                      <Badge variant="secondary" className={`text-xs ${changeTypeClass(e.change_type)}`}>
                        {e.change_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {e.module_affected && <span>Module: {e.module_affected}</span>}
                      <span>By: {e.author}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FounderLayout>
  );
};

export default BuildLog;
