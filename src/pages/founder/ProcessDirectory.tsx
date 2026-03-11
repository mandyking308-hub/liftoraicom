import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Search, Network } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusClass = (s: string) => {
  if (s === "fully_automated") return "bg-green-500/20 text-green-400";
  if (s === "partially_automated") return "bg-yellow-500/20 text-yellow-400";
  if (s === "in_progress") return "bg-primary/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const ProcessDirectory = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client_organisation: "", department: "", description: "" });

  const { data: processes = [], refetch } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = processes.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client_organisation?.toLowerCase().includes(search.toLowerCase()) ||
    p.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Process name is required"); return; }
    const { error } = await supabase.from("processes").insert({
      name: form.name.trim(),
      client_organisation: form.client_organisation.trim(),
      department: form.department.trim(),
      description: form.description.trim(),
    });
    if (error) { toast.error("Failed to create process"); return; }
    toast.success("Process created");
    setForm({ name: "", client_organisation: "", department: "", description: "" });
    setOpen(false);
    refetch();
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Process Automation Designer</h1>
            <p className="text-muted-foreground text-sm mt-1">Map organisational processes and design AI-driven automation</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" /> New Process</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Process Map</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Process Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Investment Portfolio Reporting" /></div>
                <div><Label>Client Organisation</Label><Input value={form.client_organisation} onChange={e => setForm({ ...form, client_organisation: e.target.value })} placeholder="e.g. Acme Corp" /></div>
                <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Finance" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the process..." /></div>
                <Button onClick={handleCreate} className="w-full">Create Process</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search processes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-card border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No processes found. Create one to get started.</CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p: any) => (
              <Link key={p.id} to={`/founder/processes/${p.id}`}>
                <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Network size={18} className="text-primary" />
                        <CardTitle className="text-base">{p.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={statusClass(p.automation_status)}>{p.automation_status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {p.client_organisation && <p className="text-sm text-muted-foreground">{p.client_organisation}</p>}
                    {p.department && <p className="text-xs text-muted-foreground">{p.department}</p>}
                    <p className="text-xs text-muted-foreground mt-2">Created {format(new Date(p.created_at), "MMM d, yyyy")}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default ProcessDirectory;
