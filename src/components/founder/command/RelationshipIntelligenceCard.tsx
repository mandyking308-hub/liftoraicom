import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

type Row = {
  id: string;
  contact_name: string;
  organisation_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city_country: string | null;
  relationship_type: string;
  relationship_status: string;
  disclosure_level: string;
  trust_level: string | null;
  next_action_at: string | null;
  next_action_summary: string | null;
  last_contact_at: string | null;
  tags: string[] | null;
};

function disclosureBadge(level: string) {
  const map: Record<string, { label: string; cls: string }> = {
    public_only: { label: "Public only", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    light_context: { label: "Light context", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
    nda_before_detail: { label: "NDA before detail", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
    restricted: { label: "Restricted", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
    confidential_allowed: { label: "Confidential allowed", cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  };
  const m = map[level] ?? { label: level || "—", cls: "bg-secondary text-muted-foreground border-border/50" };
  return <Badge variant="outline" className={`${m.cls} text-[10px]`}>{m.label}</Badge>;
}

async function fetchRows(): Promise<Row[]> {
  const { data } = await sb
    .from("relationship_intelligence_contacts")
    .select("id,contact_name,organisation_name,email,phone,website,city_country,relationship_type,relationship_status,disclosure_level,trust_level,next_action_at,next_action_summary,last_contact_at,tags")
    .limit(2000);
  return (data ?? []) as Row[];
}

export default function RelationshipIntelligenceCard() {
  const { data: rows = [] } = useQuery({ queryKey: ["ri-card"], queryFn: fetchRows, refetchInterval: 60000 });

  const now = Date.now();
  const in7 = now + 7 * 86400000;
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const hasTag = (r: Row, t: string) => (r.tags ?? []).some((x) => x?.toLowerCase() === t);
  const missing = (r: Row) => !r.phone || !r.email || !r.website || !r.city_country;

  const total = rows.length;
  const needsFollowUp = rows.filter(r => r.relationship_status === "needs_follow_up" || hasTag(r, "follow-up")).length;
  const meetingsBooked = rows.filter(r => r.relationship_status === "meeting_booked" || hasTag(r, "meeting-booked")).length;
  const ndaRequired = rows.filter(r => r.disclosure_level === "nda_before_detail" || hasTag(r, "nda-required")).length;
  const restricted = rows.filter(r => r.disclosure_level === "restricted" || hasTag(r, "restricted-disclosure")).length;
  const advisers = rows.filter(r => r.relationship_type === "adviser" || r.relationship_type === "legal" || r.relationship_type === "tax" || r.relationship_type === "finance").length;
  const suppliers = rows.filter(r => r.relationship_type === "supplier" || r.relationship_type === "operator").length;
  const customersPartners = rows.filter(r => ["customer","prospect","partner","buyer","investor"].includes(r.relationship_type)).length;
  const govTrade = rows.filter(r => ["government","trade","property","school"].includes(r.relationship_type) || hasTag(r, "trade-route")).length;
  const missingDetails = rows.filter(missing).length;

  const followUps = rows
    .filter(r => r.next_action_at && new Date(r.next_action_at).getTime() <= todayEnd.getTime())
    .sort((a, b) => new Date(a.next_action_at!).getTime() - new Date(b.next_action_at!).getTime())
    .slice(0, 6);
  const upcomingMeetings = rows
    .filter(r => (r.relationship_status === "meeting_booked" || hasTag(r, "meeting-booked")) && r.next_action_at && new Date(r.next_action_at).getTime() > now && new Date(r.next_action_at).getTime() <= in7)
    .slice(0, 4);
  const ndaList = rows.filter(r => r.disclosure_level === "nda_before_detail").slice(0, 4);
  const restrictedList = rows.filter(r => r.disclosure_level === "restricted").slice(0, 4);
  const missingList = rows.filter(missing).slice(0, 4);

  const watch = needsFollowUp + restricted + ndaRequired;
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";

  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Network size={14} className="text-primary" /> Relationship Intelligence — Network Assets
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]"><Lock size={9} className="mr-1" /> Founder-only</Badge>
          <Link to="/founder/relationship-intelligence" className="ml-auto">
            <Button size="sm" variant="ghost" className="h-7 text-[11px]">Open Relationship Intelligence <ArrowRight size={12} /></Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Total relationships" value={total} />
          <Stat label="Needs follow-up" value={needsFollowUp} tone={needsFollowUp ? "warn" : undefined} />
          <Stat label="Meetings booked" value={meetingsBooked} tone={meetingsBooked ? "ok" : undefined} />
          <Stat label="NDA required" value={ndaRequired} tone={ndaRequired ? "warn" : undefined} />
          <Stat label="Restricted" value={restricted} tone={restricted ? "bad" : undefined} />
          <Stat label="Strategic advisers" value={advisers} />
          <Stat label="Suppliers / operators" value={suppliers} />
          <Stat label="Customers / partners" value={customersPartners} />
          <Stat label="Gov / trade routes" value={govTrade} />
          <Stat label="Missing details" value={missingDetails} tone={missingDetails ? "warn" : undefined} />
        </div>

        <PriorityList title="Follow-ups due today / overdue" rows={followUps} emptyText="No follow-ups due." />
        <PriorityList title="Meetings booked next 7 days" rows={upcomingMeetings} emptyText="No meetings booked in the next 7 days." />
        <PriorityList title="NDA before detail" rows={ndaList} emptyText="No NDA-before-detail contacts." />
        <PriorityList title="Restricted disclosure" rows={restrictedList} emptyText="No restricted contacts." />
        <PriorityList title="Missing phone / email / website" rows={missingList} emptyText="All visible records have core details." />

        <p className="text-[10px] text-muted-foreground">
          Summary only — confidential notes, meeting detail and free-text are never shown here. Open the record to view sensitive context.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300"
    : tone === "warn" ? "border-yellow-500/40 text-yellow-300"
    : tone === "ok" ? "border-emerald-500/40 text-emerald-400"
    : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function PriorityList({ title, rows, emptyText }: { title: string; rows: Row[]; emptyText: string }) {
  return (
    <div className="border border-border/50 rounded p-2 space-y-1">
      <p className="text-[11px] font-semibold text-foreground/90">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-1">
          {rows.map(r => (
            <Link
              key={r.id}
              to={`/founder/relationship-intelligence?contact=${r.id}`}
              className="flex items-center gap-2 text-[11px] p-1.5 rounded hover:bg-secondary/40 transition"
            >
              <span className="font-medium truncate max-w-[140px]">{r.contact_name}</span>
              <span className="text-muted-foreground truncate max-w-[140px]">{r.organisation_name ?? "—"}</span>
              <Badge variant="outline" className="text-[9px] uppercase">{r.relationship_type}</Badge>
              <Badge variant="outline" className="text-[9px]">{r.relationship_status}</Badge>
              {disclosureBadge(r.disclosure_level)}
              <span className="ml-auto text-muted-foreground truncate max-w-[200px]">
                {r.next_action_summary ? `→ ${r.next_action_summary}` : (r.next_action_at ? `→ ${new Date(r.next_action_at).toLocaleDateString()}` : "")}
              </span>
              <ArrowRight size={10} className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}