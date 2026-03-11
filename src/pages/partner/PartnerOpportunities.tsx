import PartnerLayout from "@/components/partner/PartnerLayout";
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
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  new_submission: "bg-primary/20 text-primary",
  under_review: "bg-yellow-500/20 text-yellow-400",
  proposal_sent: "bg-blue-500/20 text-blue-400",
  negotiation: "bg-purple-500/20 text-purple-400",
  project_confirmed: "bg-green-500/20 text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const PartnerOpportunities = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["partner-opportunities", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_opportunities")
        .select("*")
        .eq("partner_id", profileId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("partner_opportunities").insert({
        partner_id: profileId!,
        company_name: form.get("company_name") as string,
        industry: form.get("industry") as string,
        project_description: form.get("project_description") as string,
        estimated_scope: form.get("estimated_scope") as string,
        timeline: form.get("timeline") as string,
        primary_contact: form.get("primary_contact") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-opportunities"] });
      setOpen(false);
      toast.success("Opportunity registered successfully.");
    },
    onError: () => toast.error("Failed to register opportunity."),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(new FormData(e.currentTarget));
  };

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Opportunities</h1>
            <p className="text-muted-foreground text-sm mt-1">Register and track project opportunities</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> New Opportunity</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Register Opportunity</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Company Name *</label>
                  <Input name="company_name" required placeholder="Client company" className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Industry</label>
                  <Select name="industry">
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", "Other"].map((i) => (
                        <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Project Description *</label>
                  <Textarea name="project_description" required placeholder="Describe the opportunity..." className="bg-secondary border-border min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Estimated Scope</label>
                    <Select name="estimated_scope">
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Timeline</label>
                    <Select name="timeline">
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">Immediately</SelectItem>
                        <SelectItem value="1-3 months">1–3 months</SelectItem>
                        <SelectItem value="3-6 months">3–6 months</SelectItem>
                        <SelectItem value="exploratory">Exploratory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Primary Contact</label>
                  <Input name="primary_contact" placeholder="Contact name or email" className="bg-secondary border-border" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Register Opportunity"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : opportunities.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No opportunities registered yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <Link key={opp.id} to={`/partner/opportunities/${opp.id}`}>
                <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{opp.company_name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {opp.industry || "—"} · {opp.estimated_scope || "—"} · {format(new Date(opp.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge className={statusColors[opp.status] || "bg-muted text-muted-foreground"} variant="secondary">
                      {opp.status.replace(/_/g, " ")}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
};

export default PartnerOpportunities;
