import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";

interface UsabilityResult {
  usability_status: string;
  command_centre_score: number;
  manual_update_score: number;
  manual_version: string;
  sections_present: { section: string; present: boolean }[];
  broken_links: number;
  missing_cards: string[];
  missing_manual_sections: string[];
  stale_demoted: string[];
  external_actions_gate: string;
  next_fixes: string[];
}

interface LinkResult {
  total_links_checked: number;
  broken_links: string[];
  missing_anchors: string[];
  missing_routes: string[];
}

const NEXT_ACTIONS = [
  "Read Founder Alert Strip at top of Command Centre",
  "Pick active business in Master Business Selector",
  "Work the 'What should Mandy do now?' list top-to-bottom",
  "Scan Customer Journey Flow Map for stuck stages",
  "Check Human Layer (onboarding, complaints, low-CSAT)",
  "Approve / reject items in Founder Approvals",
  "Run safe internal agents (gates remain locked)",
  "Glance at Revenue + Risk strips",
  "Open Manual v5.0 if any module shows 'not configured'",
  "Run command-centre-usability-acceptance to snapshot today's PASS",
];

export const CommandCentreUsabilityReportPanel = () => {
  const [usability, setUsability] = useState<UsabilityResult | null>(null);
  const [links, setLinks] = useState<LinkResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [u, l] = await Promise.all([
        supabase.functions.invoke("command-centre-usability-acceptance"),
        supabase.functions.invoke("command-centre-full-link-check"),
      ]);
      if (u.data) setUsability(u.data as UsabilityResult);
      if (l.data) setLinks(l.data as LinkResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Command Centre Usability Report
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Manual v5.0 · External actions LOCKED · No external send / publish / DM / spend
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Status" value={usability?.usability_status ?? "—"} />
          <Stat label="CC Score" value={usability ? `${usability.command_centre_score}` : "—"} />
          <Stat label="Manual Score" value={usability ? `${usability.manual_update_score}` : "—"} />
          <Stat label="Broken links" value={links ? `${links.broken_links.length}` : "—"} />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Sections present</h4>
          <div className="flex flex-wrap gap-2">
            {usability?.sections_present.map(s => (
              <Badge key={s.section} variant={s.present ? "secondary" : "destructive"}>
                {s.present ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                {s.section}
              </Badge>
            ))}
          </div>
        </div>

        {usability && usability.stale_demoted.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Stale items demoted to Legacy</h4>
            <div className="flex flex-wrap gap-2">
              {usability.stale_demoted.map(s => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">First 10 actions Mandy should take</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
            {NEXT_ACTIONS.map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border/40 bg-muted/20 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold mt-1">{value}</div>
  </div>
);

export default CommandCentreUsabilityReportPanel;