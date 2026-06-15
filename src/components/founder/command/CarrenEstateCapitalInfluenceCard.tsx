import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

const SELECT = [
  "id","contact_name","organisation_name","email","phone","website","city_country",
  "relationship_type","relationship_status","opportunity_role","trust_level","disclosure_level",
  "next_action_at","next_action_summary","tags",
  "capital_lane","capital_role","money_signal","relationship_angle","best_vehicle",
  "conversation_posture","outreach_status","compliance_boundary","source_platform","source_evidence",
  "facebook_profile_url","age_or_age_band","hnw_signal_confidence","philanthropy_cause_fit",
  "deal_relevance","alignment_quality","park_reason","next_move_owner",
  "priority_notes","private_capital_notes","philanthropy_notes","elite_context_notes","disclosure_warning",
  "commercial_value_score","strategic_value_score","urgency_score",
].join(",");

type R = any;

const ELITE_ROLES = ["private_client_lawyer","tax_adviser","accountant","property_adviser","introducer","wealth_manager","private_bank","family_office"];
const DEAL_ROLES = ["m_and_a_adviser","independent_sponsor","search_fund","corporate_development","strategic_acquirer"];
const MONEY_ROLES = ["family_office","private_bank","wealth_manager","financial_adviser","dfm","fund_manager","pe_fund","independent_sponsor","m_and_a_adviser","corporate_development","strategic_acquirer"];
const DEAL_RELS = ["capital_source","deal_source","buyer_route","seller_route","operating_partner","co_investment_route","adviser_route"];
const PHIL_ROLES = ["donor","foundation","philanthropy_adviser"];

function pretty(s?: string | null) { return (s ?? "").replace(/_/g, " "); }

function capitalPriority(c: R): number {
  let s = (c.strategic_value_score ?? 0) + (c.commercial_value_score ?? 0) + (c.urgency_score ?? 0);
  if (c.best_vehicle === "carren_estate" || c.best_vehicle === "both") s += 2;
  if (["family_office","private_bank","independent_sponsor","m_and_a_adviser","pe_fund","strategic_acquirer","corporate_development","operating_partner"].includes(c.capital_role)) s += 2;
  if (c.outreach_status === "ready_to_contact" || c.outreach_status === "meeting_booked") s += 2;
  if (c.disclosure_level === "restricted") s -= 3;
  if (c.outreach_status === "do_not_contact") s -= 5;
  if (c.capital_lane === "parked_not_priority") s -= 3;
  if (c.alignment_quality === "poor") s -= 3;
  if (c.alignment_quality === "parasite_risk") s -= 5;
  return s;
}
function philanthropyPriority(c: R): number {
  let s = (c.strategic_value_score ?? 0) + (c.urgency_score ?? 0);
  if (c.best_vehicle === "ghat" || c.best_vehicle === "both") s += 2;
  if (PHIL_ROLES.includes(c.capital_role)) s += 2;
  if (c.philanthropy_cause_fit === "global_health" || c.philanthropy_cause_fit === "health_access") s += 2;
  if (c.outreach_status === "do_not_contact") s -= 5;
  if (c.alignment_quality === "poor" || c.alignment_quality === "parasite_risk") s -= 3;
  return s;
}

function rowBadges(c: R) {
  const out: { l: string; cls: string }[] = [];
  if (c.best_vehicle === "carren_estate" || c.best_vehicle === "both") out.push({ l: "Carren Estate", cls: "bg-primary/15 text-primary border-primary/30" });
  if (c.best_vehicle === "ghat" || c.best_vehicle === "both") out.push({ l: "GHAT", cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" });
  if (c.best_vehicle === "both") out.push({ l: "Both", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" });
  if (c.disclosure_level === "nda_before_detail") out.push({ l: "NDA", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" });
  if (c.disclosure_level === "restricted" || c.compliance_boundary === "restricted") out.push({ l: "Restricted", cls: "bg-red-500/15 text-red-300 border-red-500/30" });
  if (c.capital_lane === "parked_not_priority" || c.best_vehicle === "park" || c.outreach_status === "parked") out.push({ l: "Park", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" });
  if (c.alignment_quality === "parasite_risk") out.push({ l: "Parasite-risk", cls: "bg-red-500/15 text-red-300 border-red-500/30" });
  return out;
}

function rowLink(id: string) {
  return `/founder/relationship-intelligence?tab=capital-influence&contact=${id}`;
}

async function fetchRows(): Promise<R[]> {
  const { data } = await sb.from("relationship_intelligence_contacts").select(SELECT).limit(2000);
  return (data ?? []) as R[];
}

export default function CarrenEstateCapitalInfluenceCard() {
  const { data: rows = [] } = useQuery({ queryKey: ["carren-capital-influence-card"], queryFn: fetchRows, refetchInterval: 60000 });

  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const overdue = (c: R) => c.next_action_at && new Date(c.next_action_at).getTime() <= todayEnd.getTime();

  const isCarren = (c: R) => c.capital_lane === "carren_estate_principal_capital" || c.best_vehicle === "carren_estate" || c.best_vehicle === "both";
  const isGhat = (c: R) => c.capital_lane === "ghat_philanthropy_giving" || c.best_vehicle === "ghat" || c.best_vehicle === "both";
  const isElite = (c: R) => c.capital_lane === "elite_advisory_credibility" || ELITE_ROLES.includes(c.capital_role);
  const isDeal = (c: R) => c.capital_lane === "deal_flow_acquisition" || DEAL_ROLES.includes(c.capital_role) || DEAL_RELS.includes(c.deal_relevance);
  const isMedia = (c: R) => c.capital_lane === "media_influence_profile" || c.capital_role === "media_contact";
  const isFacebook = (c: R) => c.source_platform === "facebook" || !!c.facebook_profile_url;
  const isParked = (c: R) => c.capital_lane === "parked_not_priority" || c.best_vehicle === "park" || c.outreach_status === "parked" || c.outreach_status === "do_not_contact";
  const isParasite = (c: R) => c.alignment_quality === "poor" || c.alignment_quality === "parasite_risk";
  const hasAnyCapitalField = (c: R) =>
    !!c.capital_lane || !!c.best_vehicle || (c.capital_role && c.capital_role !== "unknown") ||
    !!c.money_signal || !!c.relationship_angle || !!c.deal_relevance || !!c.philanthropy_cause_fit ||
    ["facebook","linkedin","public_research","event_list"].includes(c.source_platform);

  const counts = {
    total: rows.filter(hasAnyCapitalField).length,
    carren: rows.filter(isCarren).length,
    ghat: rows.filter(isGhat).length,
    elite: rows.filter(isElite).length,
    family: rows.filter((c: R) => ["family_office","private_bank"].includes(c.capital_role)).length,
    wealth: rows.filter((c: R) => ["wealth_manager","financial_adviser","dfm"].includes(c.capital_role)).length,
    deal: rows.filter(isDeal).length,
    media: rows.filter(isMedia).length,
    facebook: rows.filter(isFacebook).length,
    ready: rows.filter((c: R) => c.outreach_status === "ready_to_contact").length,
    meetings: rows.filter((c: R) => c.outreach_status === "meeting_booked" || c.relationship_status === "meeting_booked").length,
    followUp: rows.filter((c: R) => c.outreach_status === "follow_up_due" || c.relationship_status === "needs_follow_up" || overdue(c)).length,
    nda: rows.filter((c: R) => c.disclosure_level === "nda_before_detail" || c.compliance_boundary === "legal_review_required").length,
    restricted: rows.filter((c: R) => c.disclosure_level === "restricted" || c.compliance_boundary === "restricted").length,
    parked: rows.filter(isParked).length,
    parasite: rows.filter(isParasite).length,
  };

  // Lists
  const principalToOpen = rows
    .filter((c: R) => (c.best_vehicle === "carren_estate" || c.best_vehicle === "both" || c.capital_lane === "carren_estate_principal_capital")
      && ["researched","ready_to_contact","not_contacted"].includes(c.outreach_status)
      && c.disclosure_level !== "restricted")
    .sort((a: R, b: R) => capitalPriority(b) - capitalPriority(a))
    .slice(0, 5);

  const moneyFollowUp = rows
    .filter((c: R) => MONEY_ROLES.includes(c.capital_role)
      && (["follow_up_due","replied","meeting_requested"].includes(c.outreach_status) || overdue(c)))
    .sort((a: R, b: R) => capitalPriority(b) - capitalPriority(a))
    .slice(0, 5);

  const ghatRoutes = rows
    .filter((c: R) => c.best_vehicle === "ghat" || c.best_vehicle === "both" || c.capital_lane === "ghat_philanthropy_giving" || PHIL_ROLES.includes(c.capital_role))
    .sort((a: R, b: R) => philanthropyPriority(b) - philanthropyPriority(a))
    .slice(0, 5);

  const eliteDecision = rows
    .filter((c: R) => (c.capital_lane === "elite_advisory_credibility"
        || ["private_client_lawyer","tax_adviser","accountant","property_adviser","introducer"].includes(c.capital_role))
      && ["warm","active","needs_follow_up","meeting_booked","onboarding_pending"].includes(c.relationship_status))
    .slice(0, 5);

  const fbResearch = rows
    .filter((c: R) => (c.source_platform === "facebook" || !!c.facebook_profile_url)
      && (["unknown","low","medium"].includes(c.hnw_signal_confidence) || c.outreach_status === "researched"))
    .slice(0, 5);

  const restrictedParked = rows
    .filter((c: R) => c.disclosure_level === "restricted" || c.compliance_boundary === "restricted"
      || ["poor","parasite_risk"].includes(c.alignment_quality) || c.outreach_status === "do_not_contact" || c.best_vehicle === "park")
    .slice(0, 5);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Carren Estate Capital &amp; Influence
            </CardTitle>
            <div className="flex gap-1 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Live</Badge>
              <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30">Founder-only</Badge>
              <Badge variant="outline" className="text-[10px] bg-sky-500/15 text-sky-300 border-sky-500/30">Relationship-only</Badge>
              <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">No solicitation</Badge>
            </div>
          </div>
          <Link to="/founder/relationship-intelligence?tab=capital-influence">
            <Button size="sm" variant="outline">Open Capital &amp; Influence Map <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <Stat l="Capital & Influence" v={counts.total} />
          <Stat l="Carren Estate" v={counts.carren} tone="ok" />
          <Stat l="GHAT philanthropy" v={counts.ghat} tone="ok" />
          <Stat l="Elite advisory" v={counts.elite} />
          <Stat l="Family office / bank" v={counts.family} />
          <Stat l="Wealth / adviser" v={counts.wealth} />
          <Stat l="M&A / deal flow" v={counts.deal} />
          <Stat l="Media / profile" v={counts.media} />
          <Stat l="Facebook / social" v={counts.facebook} />
          <Stat l="Ready to contact" v={counts.ready} tone="ok" />
          <Stat l="Meetings booked" v={counts.meetings} tone="ok" />
          <Stat l="Follow-ups due" v={counts.followUp} tone={counts.followUp ? "warn" : undefined} />
          <Stat l="NDA before detail" v={counts.nda} tone={counts.nda ? "warn" : undefined} />
          <Stat l="Restricted" v={counts.restricted} tone={counts.restricted ? "warn" : undefined} />
          <Stat l="Parked" v={counts.parked} />
          <Stat l="Parasite-risk" v={counts.parasite} tone={counts.parasite ? "warn" : undefined} />
        </div>

        {counts.total === 0 && (
          <div className="text-xs text-muted-foreground border border-border/40 rounded p-3">
            No Capital &amp; Influence records yet. Classify contacts in Relationship Intelligence to populate principal capital, philanthropy alignment, elite advisory and deal-flow routes.
          </div>
        )}

        {/* Priority lists */}
        <div className="grid md:grid-cols-2 gap-3">
          <PriorityList title="Principal conversations to open" rows={principalToOpen} mode="capital" empty="No principal conversations queued." />
          <PriorityList title="Money routes needing follow-up" rows={moneyFollowUp} mode="capital" empty="No money routes awaiting follow-up." />
          <PriorityList title="GHAT philanthropy routes" rows={ghatRoutes} mode="philanthropy" empty="No philanthropy routes mapped yet." />
          <PriorityList title="Elite advisers needing decision" rows={eliteDecision} mode="capital" empty="No elite advisers awaiting decision." />
          <PriorityList title="Facebook / social-signal research" rows={fbResearch} mode="capital" empty="No social-signal records queued for research." />
          <PriorityList title="Restricted / park / parasite-risk" rows={restrictedParked} mode="capital" empty="No restricted or parked records." />
        </div>

        <div className="text-[11px] text-yellow-200/90 border border-yellow-500/30 bg-yellow-500/5 rounded p-2 flex items-start gap-2">
          <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
          Relationship intelligence only — no product literature, no solicitation, no automatic outreach, no client-money request and no external communication without founder approval.
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ l, v, tone }: { l: string; v: number; tone?: "ok" | "warn" }) {
  const cls = tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground leading-tight">{l}</p>
      <p className="text-base font-bold">{v}</p>
    </div>
  );
}

function PriorityList({ title, rows, mode, empty }: { title: string; rows: R[]; mode: "capital" | "philanthropy"; empty: string }) {
  return (
    <div className="border border-border/40 rounded p-2 space-y-1">
      <p className="text-[11px] uppercase text-muted-foreground">{title} <span className="text-muted-foreground/60">({rows.length})</span></p>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((c: R) => {
            const score = mode === "philanthropy" ? philanthropyPriority(c) : capitalPriority(c);
            const badges = rowBadges(c);
            return (
              <li key={c.id} className="text-xs">
                <Link to={rowLink(c.id)} className="block hover:bg-primary/5 rounded px-1 py-0.5 -mx-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{c.contact_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{score}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {c.organisation_name ?? "—"}
                    {c.capital_lane || c.best_vehicle ? ` · ${pretty(c.capital_lane || c.best_vehicle)}` : ""}
                    {c.capital_role && c.capital_role !== "unknown" ? ` · ${pretty(c.capital_role)}` : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {c.outreach_status ? pretty(c.outreach_status) : "—"}
                    {c.next_move_owner ? ` · owner: ${pretty(c.next_move_owner)}` : ""}
                  </div>
                  {(c.next_action_summary || c.priority_notes) && (
                    <div className="text-[10px] text-foreground/80 truncate">{c.next_action_summary || c.priority_notes}</div>
                  )}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {badges.map((b, i) => <Badge key={i} variant="outline" className={`text-[9px] ${b.cls}`}>{b.l}</Badge>)}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}