import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { CheckCircle2, ExternalLink } from "lucide-react";

export default function PublicProposalView() {
  const { token } = useParams();
  const [p, setP] = useState<any>(null);
  const [demo, setDemo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_proposal_by_token", { _token: token! });
      if (data) {
        setP(data);
        const { data: d } = await supabase.from("demo_access").select("demo_token,expires_at,status").eq("proposal_id", (data as any).id).maybeSingle();
        setDemo(d);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading proposal…</div>;
  if (!p) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Proposal not found or expired.</div>;

  const acceptUrl = `/proposals/accept/${p.accept_token}`;
  const demoUrl = demo && demo.status === "active" ? `/demo/${demo.demo_token}` : null;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <SEOHead title={`${p.title} — Liftor AI`} description={p.suggested_solution.slice(0,150)} />
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center pb-6 border-b border-border/50">
          <div className="text-xs text-primary font-medium tracking-wider mb-2">LIFTOR AI · ENGAGEMENT PROPOSAL</div>
          <h1 className="text-3xl font-bold">{p.title}</h1>
          <p className="text-muted-foreground mt-2">{p.business_name}</p>
        </div>

        <Card className="tech-card p-6 space-y-4">
          <Block title="Proposed Solution" body={p.suggested_solution} />
          <Block title="Scope" body={p.estimated_scope} />
          <Block title="Timeline" body={p.estimated_timeline} />
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Investment</h3>
            <div className="text-2xl font-bold">{p.estimated_cost_range}</div>
            <div className="mt-3 space-y-1 text-sm">
              {(p.estimated_cost_breakdown || []).map((b: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-border/30 py-1.5">
                  <span className="text-muted-foreground">{b.category}</span><span>{b.estimate}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Architecture</h3>
            <div className="grid grid-cols-2 gap-2">
              {(p.architecture_components || []).map((c: any, i: number) => (
                <div key={i} className="p-2 border border-border/50 rounded text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.type}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Projected ROI</h3>
            <p className="text-sm text-muted-foreground">{p.estimated_roi_summary}</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Mini label="Annual savings" value={p.estimated_annual_savings} />
              <Mini label="ROI period" value={p.estimated_roi_period} />
              <Mini label="Productivity" value={p.estimated_productivity_gain} />
            </div>
          </div>
        </Card>

        {demoUrl && (
          <Card className="tech-card p-6">
            <h3 className="font-semibold mb-1">Live Demo Access</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Explore a sandboxed walkthrough of the platform. Expires {new Date(demo.expires_at).toLocaleDateString()}. No real client data is shown.
            </p>
            <Button asChild variant="outline"><a href={demoUrl}><ExternalLink size={14} className="mr-2" /> Open demo</a></Button>
          </Card>
        )}

        {p.status !== "accepted" ? (
          <Card className="tech-card p-6 text-center">
            <h3 className="font-semibold mb-2">Ready to proceed?</h3>
            <p className="text-sm text-muted-foreground mb-4">Accepting this proposal initiates project setup.</p>
            <Button size="lg" asChild><a href={acceptUrl}><CheckCircle2 size={16} className="mr-2" /> Accept Proposal</a></Button>
          </Card>
        ) : (
          <Card className="tech-card p-6 text-center">
            <Badge className="bg-green-500/15 text-green-400">ACCEPTED</Badge>
            <p className="text-sm text-muted-foreground mt-2">Thank you. The team has been notified.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (<div><h3 className="text-sm font-semibold text-primary mb-1">{title}</h3><p className="text-sm text-muted-foreground">{body}</p></div>);
}
function Mini({ label, value }: { label: string; value: string }) {
  return (<div className="p-2 border border-border/50 rounded text-center"><div className="text-[10px] text-muted-foreground uppercase">{label}</div><div className="text-sm font-medium">{value}</div></div>);
}