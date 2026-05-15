import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Search, Plus, Server, Users, CheckCircle2 } from "lucide-react";
import MultiBusinessOperatingLayerPanel from "@/components/founder/operations/MultiBusinessOperatingLayerPanel";

const statusClass = (s: string) => {
  if (s === "active") return "bg-green-500/20 text-green-400";
  if (s === "inactive") return "bg-yellow-500/20 text-yellow-400";
  return "bg-muted text-muted-foreground";
};

const OrganisationDirectory = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", primary_contact: "" });

  const { data: orgs = [], refetch } = useQuery({
    queryKey: ["organisations"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Get system counts per org
  const { data: systems = [] } = useQuery({
    queryKey: ["org-systems-count"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, organisation_id");
      return data ?? [];
    },
  });

  // Get member counts per org
  const { data: members = [] } = useQuery({
    queryKey: ["org-members-count"],
    queryFn: async () => {
      const { data } = await supabase.from("organisation_members").select("id, organisation_id");
      return data ?? [];
    },
  });

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Organisation name is required"); return; }
    const { error } = await supabase.from("organisations").insert({ name: form.name, industry: form.industry, primary_contact: form.primary_contact });
    if (error) { toast.error(error.message); return; }
    toast.success("Organisation created");
    setForm({ name: "", industry: "", primary_contact: "" });
    setDialogOpen(false);
    refetch();
  };

  const filtered = orgs.filter((o: any) => {
    const matchSearch = !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.industry?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 size={24} className="text-primary" /> Organisations</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage client organisations across the platform</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" /> New Organisation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Organisation</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Organisation Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} /></div>
                <div><Label>Primary Contact</Label><Input value={form.primary_contact} onChange={e => setForm(p => ({ ...p, primary_contact: e.target.value }))} /></div>
                <Button onClick={handleCreate} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <MultiBusinessOperatingLayerPanel />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Organisations", value: orgs.length, icon: Building2 },
            { label: "Active", value: orgs.filter((o: any) => o.status === "active").length, icon: CheckCircle2 },
            { label: "Total Members", value: members.length, icon: Users },
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

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search organisations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Directory */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Organisation Directory</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm">No organisations found.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((o: any) => {
                  const sysCount = systems.filter((s: any) => s.organisation_id === o.id).length;
                  const memCount = members.filter((m: any) => m.organisation_id === o.id).length;
                  return (
                    <Link key={o.id} to={`/founder/organisations/${o.id}`}>
                      <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{o.name}</p>
                            <p className="text-xs text-muted-foreground">{o.industry || "—"}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-3">
                              <span className="flex items-center gap-1"><Server size={12} /> {sysCount}</span>
                              <span className="flex items-center gap-1"><Users size={12} /> {memCount}</span>
                            </div>
                            <Badge variant="secondary" className={statusClass(o.status)}>{o.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default OrganisationDirectory;
