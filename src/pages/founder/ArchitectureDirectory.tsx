import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Search, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusClass = (s: string) => {
  if (s === "approved") return "bg-green-500/20 text-green-400";
  if (s === "in_review") return "bg-yellow-500/20 text-yellow-400";
  if (s === "in_progress") return "bg-primary/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const ArchitectureDirectory = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client_organisation: "", system_type: "platform", system_purpose: "", description: "" });

  const { data: architectures = [], refetch } = useQuery({
    queryKey: ["architectures"],
    queryFn: async () => {
      const { data } = await supabase.from("architectures").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = architectures.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.client_organisation?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Architecture name is required"); return; }
    const { error } = await supabase.from("architectures").insert({
      name: form.name.trim(),
      client_organisation: form.client_organisation.trim(),
      system_type: form.system_type,
      system_purpose: form.system_purpose.trim(),
      description: form.description.trim(),
    });
    if (error) { toast.error("Failed to create architecture"); return; }
    toast.success("Architecture created");
    setForm({ name: "", client_organisation: "", system_type: "platform", system_purpose: "", description: "" });
    setOpen(false);
    refetch();
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Architecture Designer</h1>
            <p className="text-muted-foreground text-sm mt-1">Design AI system architectures for client platforms</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> New Architecture</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Architecture</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Architecture Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. AI Portfolio Management Platform" /></div>
                <div><Label>Client Organisation</Label><Input value={form.client_organisation} onChange={e => setForm({ ...form, client_organisation: e.target.value })} placeholder="e.g. Acme Corp" /></div>
                <div>
                  <Label>System Type</Label>
                  <Select value={form.system_type} onValueChange={v => setForm({ ...form, system_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform</SelectItem>
                      <SelectItem value="automation_system">Automation System</SelectItem>
                      <SelectItem value="data_pipeline">Data Pipeline</SelectItem>
                      <SelectItem value="ai_service">AI Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>System Purpose</Label><Textarea value={form.system_purpose} onChange={e => setForm({ ...form, system_purpose: e.target.value })} placeholder="What problem does this system solve?" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Technical description..." /></div>
                <Button onClick={handleCreate} className="w-full">Create Architecture</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search architectures..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-card border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No architectures found. Create one to get started.</CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a: any) => (
              <Link key={a.id} to={`/founder/architectures/${a.id}`}>
                <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Layers size={18} className="text-primary" />
                        <CardTitle className="text-base">{a.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={statusClass(a.status)}>{a.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {a.client_organisation && <p className="text-sm text-muted-foreground">{a.client_organisation}</p>}
                    <Badge variant="outline" className="text-xs mt-1">{a.system_type.replace(/_/g, " ")}</Badge>
                    <p className="text-xs text-muted-foreground mt-2">Created {format(new Date(a.created_at), "MMM d, yyyy")}</p>
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

export default ArchitectureDirectory;
