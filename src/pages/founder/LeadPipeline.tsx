import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { toast } from "sonner";

const stages = [
  { value: "new_inquiry", label: "New Inquiry" },
  { value: "reviewing", label: "Reviewing" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "confirmed", label: "Confirmed" },
];

const LeadPipeline = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  const loadProposals = () => {
    supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProposals(data);
        setLoading(false);
      });
  };

  useEffect(() => { loadProposals(); }, []);

  const moveToStage = async (proposalId: string, newStage: string) => {
    const { error } = await supabase.from("proposals").update({ lead_status: newStage }).eq("id", proposalId);
    if (error) {
      toast.error("Failed to move lead.");
    } else {
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, lead_status: newStage } : p))
      );
    }
  };

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stageValue: string) => {
    if (dragging) {
      moveToStage(dragging, stageValue);
      setDragging(null);
    }
  };

  return (
    <FounderLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Drag leads between stages to manage your pipeline</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageProposals = proposals.filter((p) => p.lead_status === stage.value);
              return (
                <div
                  key={stage.value}
                  className="min-w-[240px] flex-shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.value)}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{stageProposals.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[200px] p-2 rounded-xl bg-secondary/30 border border-border/30">
                    {stageProposals.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragStart(p.id)}
                        className="p-3 rounded-lg border border-border/50 bg-card cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                      >
                        <p className="text-sm font-medium mb-1">{p.company_name}</p>
                        <p className="text-xs text-muted-foreground">{p.industry}</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.project_types?.slice(0, 2).join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default LeadPipeline;
