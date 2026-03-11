import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

const FeatureRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState("");

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("id, projects(name)").eq("client_id", profileId!).eq("status", "active");
      return data ?? [];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["feature-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const subId = subscriptions[0]?.id;
      if (!subId) throw new Error("No active subscription");
      const { error } = await supabase.from("feature_requests").insert({
        subscription_id: subId,
        user_id: user!.id,
        title: form.get("title") as string,
        description: form.get("description") as string,
        business_impact: impact,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
      setOpen(false);
      setImpact("");
      toast.success("Feature request submitted.");
    },
    onError: () => toast.error("Failed to submit request."),
  });

  const statusColors: Record<string, string> = {
    submitted: "bg-primary/20 text-primary",
    under_review: "bg-yellow-500/20 text-yellow-400",
    planned: "bg-blue-500/20 text-blue-400",
    in_development: "bg-purple-500/20 text-purple-400",
    completed: "bg-green-500/20 text-green-400",
    declined: "bg-muted text-muted-foreground",
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Feature Requests</h1>
            <p className="text-muted-foreground text-sm mt-1">Suggest improvements for your platform</p>
          </div>
          {subscriptions.length > 0 && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus size={16} /> New Request</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Submit Feature Request</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Feature Title *</label>
                    <Input name="title" required placeholder="Feature name" className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description *</label>
                    <Textarea name="description" required placeholder="Describe the feature..." className="bg-secondary border-border min-h-[100px]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Impact</label>
                    <Select value={impact} onValueChange={setImpact}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select impact level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {requests.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No feature requests yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => (
              <Card key={r.id} className="bg-card border-border/50">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                      {r.business_impact ? ` · Impact: ${r.business_impact}` : ""}
                    </p>
                  </div>
                  <Badge className={statusColors[r.status] || ""} variant="secondary">{r.status.replace(/_/g, " ")}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default FeatureRequests;
