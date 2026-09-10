import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EDUCATION_BUSINESSES } from "@/lib/education/educationBusinesses";
import { EDUCATION_CAMPAIGN_SHELLS } from "@/lib/education/educationCampaignShells";
import { DEFAULT_CROSS_BRAND_COOLDOWN_DAYS } from "@/lib/education/portfolioCollision";
import { EducationFunnelRow, loadEducationFunnel } from "@/lib/education/educationFunnelAnalytics";
import { GraduationCap, ShieldCheck, Lock } from "lucide-react";

const sb: any = supabase as any;

export default function EducationCommercialLayerPage() {
  const [funnel, setFunnel] = useState<EducationFunnelRow[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const names = EDUCATION_BUSINESSES.map((b) => b.name);
        const [f, d] = await Promise.all([
          loadEducationFunnel(names),
          sb
            .from("outreach_campaign_drafts")
            .select("campaign_key, campaign_name, status, is_live, external_send_blocked, founder_approval_state, test_state, qualification_threshold, batch_min, batch_max, smartlead_campaign_id")
            .in("campaign_key", EDUCATION_CAMPAIGN_SHELLS.map((s) => s.campaign_key)),
        ]);
        setFunnel(f);
        setDrafts(d.data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Could not load education commercial data");
      }
    })();
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <Card className="tech-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Education Commercial Layer
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Four education businesses, one contact record per person, business-specific
                  relevance and portfolio-wide collision protection.
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" /> Nothing live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Cross-brand cooldown is {DEFAULT_CROSS_BRAND_COOLDOWN_DAYS} days. Only one brand may own
              outbound to a person at a time. Suppression, unsubscribe, do-not-contact, hard bounce and
              an active reply block every brand and cannot be overridden.
            </p>
            <Button size="sm" asChild>
              <Link to="/founder/business-manuals">Open Business Manuals</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Campaign shells</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.length === 0 && <p className="text-sm text-muted-foreground">No campaign shells loaded.</p>}
            {drafts.map((d) => (
              <div key={d.campaign_key} className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-2">
                <span className="text-sm font-medium">{d.campaign_name}</span>
                <Badge variant="outline">{d.status}</Badge>
                <Badge variant={d.is_live ? "destructive" : "secondary"}>
                  {d.is_live ? "LIVE" : "not live"}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {d.external_send_blocked ? "external send blocked" : "send unblocked"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  approval: {d.founder_approval_state} · test: {d.test_state} · threshold {d.qualification_threshold} ·
                  batch {d.batch_min}–{d.batch_max} · provider campaign:{" "}
                  {d.smartlead_campaign_id ?? "none"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Commercial funnel</CardTitle>
            <p className="text-xs text-muted-foreground">
              Measures that cannot yet be observed show as “n/a” rather than an invented figure.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-3">Business</th>
                  <th className="py-1 pr-3">Accounts</th>
                  <th className="py-1 pr-3">Relevant</th>
                  <th className="py-1 pr-3">Eligible</th>
                  <th className="py-1 pr-3">Allocated</th>
                  <th className="py-1 pr-3">Contacted</th>
                  <th className="py-1 pr-3">Replies</th>
                  <th className="py-1 pr-3">Positive</th>
                  <th className="py-1 pr-3">Meetings</th>
                  <th className="py-1 pr-3">Proposals</th>
                  <th className="py-1 pr-3">Wins</th>
                  <th className="py-1 pr-3">Revenue</th>
                  <th className="py-1 pr-3">Exclusions</th>
                  <th className="py-1 pr-3">Collisions</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((r) => (
                  <tr key={r.business_name} className="border-t border-border/40">
                    <td className="py-1 pr-3 font-medium">{r.business_name}</td>
                    <td className="py-1 pr-3">{r.accounts_in_scope}</td>
                    <td className="py-1 pr-3">{r.contacts_relevant}</td>
                    <td className="py-1 pr-3">{r.contacts_eligible}</td>
                    <td className="py-1 pr-3">{r.allocated}</td>
                    <td className="py-1 pr-3">{r.contacted}</td>
                    <td className="py-1 pr-3">{r.replies}</td>
                    <td className="py-1 pr-3">{r.positive_replies ?? "n/a"}</td>
                    <td className="py-1 pr-3">{r.meetings ?? "n/a"}</td>
                    <td className="py-1 pr-3">{r.proposals ?? "n/a"}</td>
                    <td className="py-1 pr-3">{r.wins ?? "n/a"}</td>
                    <td className="py-1 pr-3">{r.revenue ?? "n/a"}</td>
                    <td className="py-1 pr-3">{r.exclusions}</td>
                    <td className="py-1 pr-3">{r.collisions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}
