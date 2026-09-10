import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Lock, Building2, Users, MailCheck } from "lucide-react";

/**
 * Read-only Apollo/education status surface.
 * CRM-native truth: organisations = companies, contacts = people.
 * Deliberately contains NO control that can spend an Apollo credit or send email.
 */
const ApolloCreditFirewallPanel = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["apollo-credit-firewall-crm-education-status"],
    refetchInterval: 60000,
    queryFn: async () => {
      const db = supabase as any;
      const [status, organisations, international, candidates, revealed] = await Promise.all([
        db.rpc("apollo_credit_status"),
        db.from("organisations").select("id", { count: "exact", head: true }).eq("is_education_target", true),
        db.from("organisations").select("id", { count: "exact", head: true })
          .eq("is_education_target", true).eq("qualification", "International operator"),
        db.from("contacts").select("id", { count: "exact", head: true })
          .eq("research_program_key", "education_152_master_2026_09"),
        db.from("contacts").select("id", { count: "exact", head: true })
          .eq("research_program_key", "education_152_master_2026_09")
          .eq("reveal_status", "revealed_business_email"),
      ]);
      return {
        policy: (status.data ?? null) as Record<string, any> | null,
        organisationCount: organisations.count ?? 0,
        internationalCount: international.count ?? 0,
        candidateCount: candidates.count ?? 0,
        revealedCount: revealed.count ?? 0,
      };
    },
  });

  if (isLoading || !data) return null;
  const p = data.policy;
  const enabled = Boolean(p?.paid_enrichment_enabled);
  const limit = Number(p?.hard_credit_limit ?? 0);
  const locked = !enabled || limit <= 0;

  const flag = (label: string, on: boolean) => (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={on ? "destructive" : "secondary"} className="text-[10px]">{on ? "ALLOWED" : "OFF"}</Badge>
    </div>
  );

  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {locked ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
          Apollo Credit Firewall · Education CRM
          <Badge variant={locked ? "secondary" : "destructive"} className="ml-auto text-[10px]">
            {locked ? "PAID ENRICHMENT LOCKED" : "PAID ENRICHMENT OPEN"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Hard limit", limit],
            ["Used", Number(p?.credits_used ?? 0)],
            ["Reserved", Number(p?.credits_reserved ?? 0)],
            ["Remaining", Number(p?.credits_remaining ?? 0)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border/50 p-3">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{String(value)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border/50 p-3">
          <p className="text-xs font-medium mb-1 flex items-center gap-1.5"><Lock className="h-3 w-3" /> Reveal permissions</p>
          {flag("Phone reveal", Boolean(p?.allow_phone_reveal))}
          {flag("Personal email reveal", Boolean(p?.allow_personal_email_reveal))}
          {flag("Waterfall enrichment", Boolean(p?.allow_waterfall))}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground">Per-run cap</span>
            <span className="tabular-nums">{Number(p?.per_run_cap ?? 0)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Education CRM companies</p>
            <p className="text-lg font-semibold tabular-nums">{data.organisationCount}</p>
            <p className="text-[11px] text-muted-foreground">Canonical table: organisations</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" /> International operators</p>
            <p className="text-lg font-semibold tabular-nums">{data.internationalCount}</p>
            <p className="text-[11px] text-muted-foreground">First contact-search cohort</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Users className="h-3 w-3" /> Education CRM candidates</p>
            <p className="text-lg font-semibold tabular-nums">{data.candidateCount}</p>
            <p className="text-[11px] text-muted-foreground">Canonical table: contacts</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><MailCheck className="h-3 w-3" /> Business emails revealed</p>
            <p className="text-lg font-semibold tabular-nums">{data.revealedCount}</p>
            <p className="text-[11px] text-muted-foreground">Still needs sendability/campaign approval</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Education companies live in the CRM organisation spine and education people live in the CRM contact spine.
          Strategic accounts only prioritise those companies. Every paid Apollo request must first obtain an atomic
          reservation from the portfolio firewall. This panel is read-only and cannot spend credits or send email.
        </p>
      </CardContent>
    </Card>
  );
};

export default ApolloCreditFirewallPanel;
