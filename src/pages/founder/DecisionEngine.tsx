import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, TrendingUp, Zap, Building2, Target, CheckCircle2, XCircle, Clock, AlertTriangle, Plus, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

const categories = [
  { value: "operational", label: "Operational Optimisation", icon: Zap },
  { value: "system", label: "System Improvements", icon: Target },
  { value: "automation", label: "Automation Opportunities", icon: TrendingUp },
  { value: "strategic", label: "Strategic Business", icon: Building2 },
];

const priorityVariant = (p: string) => {
  if (p === "critical") return "destructive" as const;
  if (p === "high") return "default" as const;
  return "secondary" as const;
};

const statusIcon = (s: string) => {
  if (s === "approved") return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (s === "rejected") return <XCircle size={16} className="text-destructive" />;
  if (s === "deferred") return <Clock size={16} className="text-amber-500" />;
  return <AlertTriangle size={16} className="text-muted-foreground" />;
};

const DecisionEngine = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: recommendations, refetch } = useQuery({
    queryKey: ["decision-recommendations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("decision_recommendations")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const pending = recommendations?.filter((r) => r.status === "pending") || [];
  const approved = recommendations?.filter((r) => r.status === "approved") || [];
  const rejected = recommendations?.filter((r) => r.status === "rejected") || [];
  const deferred = recommendations?.filter((r) => r.status === "deferred") || [];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("decision_recommendations").insert({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      category: fd.get("category") as string,
      affected_system: fd.get("affected_system") as string,
      priority: fd.get("priority") as string,
      potential_benefits: fd.get("potential_benefits") as string,
      potential_risks: fd.get("potential_risks") as string,
      target_module: fd.get("target_module") as string,
    });
    if (error) { toast.error("Failed to create recommendation"); return; }
    toast.success("Recommendation created");
    setCreateOpen(false);
    refetch();
  };

  const handleAction = async (id: string, status: string) => {
    const { error } = await supabase
      .from("decision_recommendations")
      .update({ status, decided_at: new Date().toISOString(), decision_maker: "Founder" })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Recommendation ${status}`);
    refetch();
  };

  const previewItem = recommendations?.find((r) => r.id === previewId);

  const RecommendationCard = ({ rec }: { rec: any }) => (
    <Card key={rec.id}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium">{rec.title}</p>
              <Badge variant={priorityVariant(rec.priority)}>{rec.priority}</Badge>
              <Badge variant="outline">{rec.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{rec.description}</p>
            {rec.affected_system && (
              <p className="text-xs text-muted-foreground mt-1">System: {rec.affected_system}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(rec.created_at), "dd MMM yyyy HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setPreviewId(rec.id)}>
              <Eye size={16} />
            </Button>
            {rec.status === "pending" && (
              <>
                <Button size="sm" variant="default" onClick={() => handleAction(rec.id, "approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => handleAction(rec.id, "deferred")}>Defer</Button>
                <Button size="sm" variant="ghost" onClick={() => handleAction(rec.id, "rejected")}>Dismiss</Button>
              </>
            )}
            {rec.status !== "pending" && (
              <div className="flex items-center gap-1">
                {statusIcon(rec.status)}
                <span className="text-sm capitalize">{rec.status}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Scale className="text-primary" size={32} />
              AI Decision Engine
            </h1>
            <p className="text-muted-foreground mt-1">Transform platform intelligence into actionable recommendations</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" /> New Recommendation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Recommendation</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input name="title" placeholder="Recommendation title" required />
                <Textarea name="description" placeholder="Description" />
                <Select name="category" defaultValue="operational">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input name="affected_system" placeholder="Affected system" />
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Input name="target_module" placeholder="Target module (e.g. Workflow Builder)" />
                <Textarea name="potential_benefits" placeholder="Potential benefits" />
                <Textarea name="potential_risks" placeholder="Potential risks" />
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const count = recommendations?.filter((r) => r.category === cat.value).length || 0;
            return (
              <Card key={cat.value}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{cat.label}</p>
                      <p className="text-3xl font-bold">{count}</p>
                    </div>
                    <cat.icon className="text-primary" size={24} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="deferred">Deferred ({deferred.length})</TabsTrigger>
            <TabsTrigger value="rejected">Dismissed ({rejected.length})</TabsTrigger>
            <TabsTrigger value="history">Full History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 && <p className="text-muted-foreground text-sm">No pending recommendations.</p>}
            {pending.map((r) => <RecommendationCard key={r.id} rec={r} />)}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3 mt-4">
            {approved.length === 0 && <p className="text-muted-foreground text-sm">No approved recommendations.</p>}
            {approved.map((r) => <RecommendationCard key={r.id} rec={r} />)}
          </TabsContent>

          <TabsContent value="deferred" className="space-y-3 mt-4">
            {deferred.length === 0 && <p className="text-muted-foreground text-sm">No deferred recommendations.</p>}
            {deferred.map((r) => <RecommendationCard key={r.id} rec={r} />)}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3 mt-4">
            {rejected.length === 0 && <p className="text-muted-foreground text-sm">No dismissed recommendations.</p>}
            {rejected.map((r) => <RecommendationCard key={r.id} rec={r} />)}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {recommendations?.length === 0 && <p className="text-muted-foreground text-sm">No recommendations yet.</p>}
            {recommendations?.map((r) => <RecommendationCard key={r.id} rec={r} />)}
          </TabsContent>
        </Tabs>

        {/* Impact Preview Dialog */}
        <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>System Impact Preview</DialogTitle></DialogHeader>
            {previewItem && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recommendation</p>
                  <p className="font-semibold">{previewItem.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{previewItem.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <Badge variant="outline" className="mt-1">{previewItem.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <Badge variant={priorityVariant(previewItem.priority)} className="mt-1">{previewItem.priority}</Badge>
                  </div>
                </div>
                {previewItem.affected_system && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Affected Systems</p>
                    <p className="text-sm">{previewItem.affected_system}</p>
                  </div>
                )}
                {previewItem.target_module && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target Module</p>
                    <p className="text-sm">{previewItem.target_module}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-emerald-600">Potential Benefits</p>
                  <p className="text-sm">{previewItem.potential_benefits || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-destructive">Potential Risks</p>
                  <p className="text-sm">{previewItem.potential_risks || "Not specified"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Status:</p>
                  {statusIcon(previewItem.status)}
                  <span className="text-sm capitalize">{previewItem.status}</span>
                  {previewItem.decided_at && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({format(new Date(previewItem.decided_at), "dd MMM yyyy")})
                    </span>
                  )}
                </div>
                {previewItem.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={() => { handleAction(previewItem.id, "approved"); setPreviewId(null); }}>Approve</Button>
                    <Button variant="outline" className="flex-1" onClick={() => { handleAction(previewItem.id, "deferred"); setPreviewId(null); }}>Defer</Button>
                    <Button variant="ghost" className="flex-1" onClick={() => { handleAction(previewItem.id, "rejected"); setPreviewId(null); }}>Dismiss</Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
};

export default DecisionEngine;
