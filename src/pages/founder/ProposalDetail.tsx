import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const leadStatuses = [
  { value: "new_inquiry", label: "New Inquiry" },
  { value: "reviewing", label: "Reviewing" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "confirmed", label: "Confirmed Project" },
];

const ProposalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("proposals").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setProposal(data);
      setLoading(false);
    });
  }, [id]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("proposals").update({ lead_status: status }).eq("id", id!);
    if (error) {
      toast.error("Failed to update status.");
    } else {
      setProposal((prev: any) => ({ ...prev, lead_status: status }));
      toast.success("Status updated.");
    }
  };

  if (loading) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;
  if (!proposal) return <FounderLayout><p className="text-muted-foreground">Proposal not found.</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="max-w-3xl">
        <Link to="/founder/proposals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} /> Back to Proposals
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{proposal.company_name}</h1>
            <p className="text-muted-foreground mt-1">{proposal.industry} · {proposal.company_size}</p>
          </div>
          <div className="w-48">
            <Select value={proposal.lead_status} onValueChange={updateStatus}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-6">
          {proposal.contact_name && (
            <div className="p-5 rounded-xl border border-border/50 bg-card">
              <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Contact</h3>
              <p className="text-sm">{proposal.contact_name}</p>
              {proposal.contact_email && <p className="text-sm text-muted-foreground">{proposal.contact_email}</p>}
              {proposal.website_url && <p className="text-sm text-muted-foreground">{proposal.website_url}</p>}
            </div>
          )}

          <div className="p-5 rounded-xl border border-border/50 bg-card">
            <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Project Types</h3>
            <div className="flex flex-wrap gap-2">
              {proposal.project_types?.map((t: string) => (
                <span key={t} className="text-xs px-2 py-1 rounded bg-secondary">{t}</span>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-border/50 bg-card">
            <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Business Problem</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{proposal.business_problem}</p>
          </div>

          <div className="p-5 rounded-xl border border-border/50 bg-card">
            <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Processes to Automate</h3>
            <div className="flex flex-wrap gap-2">
              {proposal.processes_to_automate?.map((p: string) => (
                <span key={p} className="text-xs px-2 py-1 rounded bg-secondary">{p}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-xl border border-border/50 bg-card">
              <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Scale</h3>
              <p className="text-sm">{proposal.project_scale}</p>
            </div>
            <div className="p-5 rounded-xl border border-border/50 bg-card">
              <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Timeline</h3>
              <p className="text-sm">{proposal.timeline}</p>
            </div>
          </div>

          {proposal.ai_suggested_solution && (
            <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
              <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-3">AI-Generated Proposal</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Suggested Solution</p>
                  <p className="text-sm">{proposal.ai_suggested_solution}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estimated Scope</p>
                  <p className="text-sm">{proposal.ai_estimated_scope}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estimated Timeline</p>
                  <p className="text-sm">{proposal.ai_estimated_timeline}</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Submitted: {new Date(proposal.created_at).toLocaleString()}</p>
        </div>
      </div>
    </FounderLayout>
  );
};

export default ProposalDetail;
