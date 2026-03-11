import PartnerLayout from "@/components/partner/PartnerLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  new_submission: "bg-primary/20 text-primary",
  under_review: "bg-yellow-500/20 text-yellow-400",
  proposal_sent: "bg-blue-500/20 text-blue-400",
  negotiation: "bg-purple-500/20 text-purple-400",
  project_confirmed: "bg-green-500/20 text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const PartnerOpportunityDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: opp } = useQuery({
    queryKey: ["partner-opportunity", id],
    queryFn: async () => {
      const { data } = await supabase.from("partner_opportunities").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["partner-messages", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_messages")
        .select("*")
        .eq("opportunity_id", id!)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["partner-documents", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_documents")
        .select("*")
        .eq("opportunity_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_messages").insert({
        opportunity_id: id!,
        user_id: user!.id,
        content: message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["partner-messages", id] });
    },
    onError: () => toast.error("Failed to send message."),
  });

  if (!opp) return <PartnerLayout><p className="text-muted-foreground">Loading...</p></PartnerLayout>;

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <Link to="/partner/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to Opportunities
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{opp.company_name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{opp.industry || "—"} · Submitted {format(new Date(opp.created_at), "MMM d, yyyy")}</p>
          </div>
          <Badge className={statusColors[opp.status] || ""} variant="secondary">
            {opp.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div><span className="text-muted-foreground">Description</span><p className="mt-1">{opp.project_description || "—"}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Scope</span><p className="mt-1 capitalize">{opp.estimated_scope || "—"}</p></div>
                <div><span className="text-muted-foreground">Timeline</span><p className="mt-1 capitalize">{opp.timeline || "—"}</p></div>
              </div>
              <div><span className="text-muted-foreground">Primary Contact</span><p className="mt-1">{opp.primary_contact || "—"}</p></div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Documents</CardTitle></CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No documents yet.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                      <span>{d.name}</span>
                      <span className="text-muted-foreground text-xs">{format(new Date(d.created_at), "MMM d")}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Messages</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`p-3 rounded-lg text-sm ${m.user_id === user?.id ? "bg-primary/10 ml-8" : "bg-secondary/50 mr-8"}`}>
                    <p>{m.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.created_at), "MMM d, h:mm a")}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-secondary border-border min-h-[60px]"
              />
              <Button
                onClick={() => sendMessage.mutate()}
                disabled={!message.trim() || sendMessage.isPending}
                size="icon"
                className="h-auto"
              >
                <Send size={18} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
};

export default PartnerOpportunityDetail;
