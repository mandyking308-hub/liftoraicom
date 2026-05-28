import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FundingRadarLayout, FRSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildHandoffPack, type BuildHandoffPack } from "@/lib/fundingRadarEngine";

export default function FRBuildHandoffPack() {
  const { id } = useParams();
  const [pack, setPack] = useState<BuildHandoffPack | null>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const sb: any = supabase as any;
      const { data: cand } = await sb.from("ma_build_candidates").select("*").eq("id", id).maybeSingle();
      if (!cand) { setLoading(false); return; }
      const [{ data: shortlist }, { data: company }, { data: cluster }] = await Promise.all([
        cand.funding_shortlist_id
          ? sb.from("funding_shortlist").select("build_thesis,capital_efficiency_summary").eq("id", cand.funding_shortlist_id).maybeSingle()
          : Promise.resolve({ data: null }),
        cand.funding_company_id
          ? sb.from("funding_radar_companies").select("company_name,revenue_model_pattern,pricing_logic,distinct_execution_route").eq("id", cand.funding_company_id).maybeSingle()
          : Promise.resolve({ data: null }),
        cand.funding_cluster_id
          ? sb.from("funding_problem_clusters").select("cluster_name,problem_thesis,customer_pain,distinct_execution_route").eq("id", cand.funding_cluster_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setCandidate(cand);
      setPack(buildHandoffPack({ candidate: cand, shortlist, company, cluster, distribution: null }));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [id]);

  const download = () => {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor_build_handoff_${pack.candidate.name.replace(/\W+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <FundingRadarLayout
      title="Build Handoff Pack"
      subtitle="The handoff pack carries an approved build into Launch Factory, Business Templates, Portfolio Commander and the Command Centre. No outbound actions are taken — founder approval still gates everything."
    >
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !pack ? (
        <FRSection title="Pack unavailable">
          <p className="text-xs text-muted-foreground">No build candidate found for this id. Promote a shortlist item into the Quarterly Build Selector first.</p>
        </FRSection>
      ) : (
        <>
          <FRSection
            title={pack.candidate.name}
            description={`Generated ${new Date(pack.generated_at).toLocaleString()}`}
            actions={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={download}><Download className="h-3 w-3 mr-1" />Export pack</Button>
                <Button asChild size="sm" variant="outline"><Link to="/founder/portfolio-exit/build-selector"><FileText className="h-3 w-3 mr-1" />Build Selector</Link></Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <Block title="Problem thesis" value={pack.thesis.problem_thesis} />
              <Block title="Paying customer profile" value={pack.thesis.paying_customer_profile} />
              <Block title="Legally distinct concept" value={pack.thesis.legally_distinct_product_concept} />
              <Block title="First offer" value={pack.thesis.first_offer} />
            </div>
          </FRSection>

          <FRSection title="Build plan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <List title="Landing page structure" items={pack.build_plan.landing_page_structure} />
              <List title="CRM pipeline stages" items={pack.build_plan.crm_pipeline_stages} />
              <List title="Compliance / legal pages" items={pack.build_plan.compliance_legal_pages_needed} />
              <Block title="Pricing hypothesis" value={pack.build_plan.pricing_hypothesis} />
            </div>
          </FRSection>

          <FRSection title="Go to market">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Block title="First 100 customer plan" value={pack.go_to_market.first_100_customer_plan} />
              <Block title="Outreach angle" value={pack.go_to_market.outreach_angle} />
              <Block title="Likely acquisition channel" value={pack.go_to_market.likely_acquisition_channel} />
              <Block title="Buyer contact type" value={pack.go_to_market.buyer_contact_type} />
              <Block title="Expected sales cycle" value={pack.go_to_market.expected_sales_cycle} />
            </div>
          </FRSection>

          <FRSection title="Governance">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <List title="Approval gates" items={pack.governance.approval_gates} />
              <List title="Kill / continue criteria" items={pack.governance.kill_continue_criteria} />
              <List title="KPIs" items={pack.governance.kpis} />
            </div>
          </FRSection>

          <FRSection title="Schedule">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <List title="First 30 days" items={pack.schedule.first_30_day_execution_plan} />
              <List title="First 90 days" items={pack.schedule.first_90_day_operating_plan} />
            </div>
          </FRSection>

          <FRSection title="Connections to existing systems">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Conn label="Launch Factory" to={pack.connections.launch_factory} />
              <Conn label="Business Templates" to={pack.connections.business_templates} />
              <Conn label="Portfolio Commander" to={pack.connections.portfolio_commander} />
              <Conn label="Command Centre" to={pack.connections.command_centre} />
            </div>
          </FRSection>

          <FRSection title="Guardrails — no external actions">
            <div className="flex flex-wrap gap-1">
              {pack.guardrails.no_external_actions.map((g) => (
                <Badge key={g} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{g}</Badge>
              ))}
            </div>
          </FRSection>
        </>
      )}
    </FundingRadarLayout>
  );
}

function Block({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div className="border border-border/50 rounded p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{title}</p>
      <p className="mt-1">{value ?? <span className="text-amber-400">Needs verification</span>}</p>
    </div>
  );
}
function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-border/50 rounded p-3">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{title}</p>
      {items.length === 0 ? <p className="text-amber-400">Needs verification</p> : (
        <ul className="list-disc list-inside space-y-0.5">{items.map((it, i) => (<li key={i}>{it}</li>))}</ul>
      )}
    </div>
  );
}
function Conn({ label, to }: { label: string; to: string }) {
  return (
    <Button asChild size="sm" variant="outline" className="h-7 text-[11px] justify-between">
      <Link to={to}>{label}<ArrowRight className="h-3 w-3 ml-1" /></Link>
    </Button>
  );
}