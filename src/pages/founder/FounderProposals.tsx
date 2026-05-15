import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CreativeAssetLibraryPanel from "@/components/founder/assets/CreativeAssetLibraryPanel";
import FounderLayout from "@/components/founder/FounderLayout";
import { ArrowRight } from "lucide-react";
import { ProductisationReadinessPanel } from "@/components/founder/revenue/ProductisationReadinessPanel";
import CompetitorLearningPositioningPanel from "@/components/founder/strategy/CompetitorLearningPositioningPanel";

const FounderProposals = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProposals(data);
        setLoading(false);
      });
  }, []);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      new_inquiry: "bg-primary/10 text-primary",
      reviewing: "bg-yellow-400/10 text-yellow-400",
      proposal_sent: "bg-blue-400/10 text-blue-400",
      negotiation: "bg-orange-400/10 text-orange-400",
      confirmed: "bg-green-400/10 text-green-400",
    };
    return map[s] || "bg-secondary text-muted-foreground";
  };

  return (
    <FounderLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground mt-1">All AI proposal generator submissions</p>
        </div>

        <div className="mb-6"><ProductisationReadinessPanel /></div>
        <div className="mb-6"><CompetitorLearningPositioningPanel /></div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : proposals.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">No proposals yet.</div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <Link
                key={p.id}
                to={`/founder/proposals/${p.id}`}
                className="flex items-center justify-between p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-sm">{p.company_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(p.lead_status)}`}>
                      {p.lead_status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.industry} · {p.project_types?.join(", ")} · {p.project_scale}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
        <CreativeAssetLibraryPanel />
      </div>
    </FounderLayout>
  );
};

export default FounderProposals;
