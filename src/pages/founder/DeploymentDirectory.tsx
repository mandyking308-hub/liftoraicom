import FounderLayout from "@/components/founder/FounderLayout";
import ProductRoadmapQAReleasePanel from "@/components/founder/product/ProductRoadmapQAReleasePanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Search, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusClass = (s: string) => {
  if (s === "deployed" || s === "post_launch_monitoring") return "bg-green-500/20 text-green-400";
  if (s === "ready_for_launch") return "bg-yellow-500/20 text-yellow-400";
  if (s === "testing") return "bg-primary/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const DEFAULT_STAGES = [
  "Architecture Finalised", "Development Complete", "Automation Integrated",
  "System Testing", "Launch Preparation", "System Deployment", "Post-Launch Monitoring",
];

const DEFAULT_CHECKLIST = [
  "Infrastructure Ready", "AI Agents Configured", "Automation Workflows Verified",
  "Security Review Completed", "System Monitoring Enabled",
];

const DeploymentDirectory = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ system_name: "", client_organisation: "", architecture_id: "", expected_launch_date: "" });

  const { data: deployments = [], refetch } = useQuery({
    queryKey: ["deployments"],
    queryFn: async () => {
      const { data } = await supabase.from("deployments").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: architectures = [] } = useQuery({
    queryKey: ["archs-for-deploy"],
    queryFn: async () => {
      const { data } = await supabase.from("architectures").select("id, name");
      return data ?? [];
    },
  });

  const filtered = deployments.filter((d: any) =>
    d.system_name.toLowerCase().includes(search.toLowerCase()) ||
    d.client_organisation?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.system_name.trim()) { toast.error("System name is required"); return; }
    const { data: dep, error } = await supabase.from("deployments").insert({
      system_name: form.system_name.trim(),
      client_organisation: form.client_organisation.trim(),
      architecture_id: form.architecture_id || null,
      expected_launch_date: form.expected_launch_date || null,
    }).select().single();
    if (error || !dep) { toast.error("Failed to create deployment"); return; }

    // Create default stages and checklist
    const stageInserts = DEFAULT_STAGES.map((name, i) => ({
      deployment_id: dep.id, name, order_index: i, status: "not_started",
    }));
    const checkInserts = DEFAULT_CHECKLIST.map((item, i) => ({
      deployment_id: dep.id, item, order_index: i,
    }));
    await Promise.all([
      supabase.from("deployment_stages").insert(stageInserts),
      supabase.from("deployment_checklist").insert(checkInserts),
      supabase.from("deployment_logs").insert({ deployment_id: dep.id, event: "Deployment record created", details: `System: ${dep.system_name}` }),
    ]);

    toast.success("Deployment created");
    setForm({ system_name: "", client_organisation: "", architecture_id: "", expected_launch_date: "" });
    setOpen(false);
    refetch();
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deployment & Launch Manager</h1>
            <p className="text-muted-foreground text-sm mt-1">Track system deployment readiness and launch progress</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> New Deployment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Deployment Record</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>System Name *</Label><Input value={form.system_name} onChange={e => setForm({ ...form, system_name: e.target.value })} placeholder="e.g. AI Investment Platform" /></div>
                <div><Label>Client Organisation</Label><Input value={form.client_organisation} onChange={e => setForm({ ...form, client_organisation: e.target.value })} /></div>
                <div>
                  <Label>Architecture Reference</Label>
                  <Select value={form.architecture_id} onValueChange={v => setForm({ ...form, architecture_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select architecture..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {architectures.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Expected Launch Date</Label><Input type="date" value={form.expected_launch_date} onChange={e => setForm({ ...form, expected_launch_date: e.target.value })} /></div>
                <Button onClick={handleCreate} className="w-full">Create Deployment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search deployments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-card border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No deployments found.</CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d: any) => (
              <Link key={d.id} to={`/founder/deployments/${d.id}`}>
                <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Rocket size={18} className="text-primary" />
                        <CardTitle className="text-base">{d.system_name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={statusClass(d.status)}>{d.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {d.client_organisation && <p className="text-sm text-muted-foreground">{d.client_organisation}</p>}
                    {d.expected_launch_date && <p className="text-xs text-muted-foreground mt-1">Launch: {format(new Date(d.expected_launch_date), "MMM d, yyyy")}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Created {format(new Date(d.created_at), "MMM d, yyyy")}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="max-w-7xl mx-auto px-4 pb-6"><ProductRoadmapQAReleasePanel /></div>
    </FounderLayout>
  );
};

export default DeploymentDirectory;
