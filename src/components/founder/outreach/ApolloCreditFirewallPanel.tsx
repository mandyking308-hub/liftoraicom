import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Lock, Database, Users } from "lucide-react";

/**
 * Read-only Stage-4 status surface.
 * Deliberately contains NO control that can spend an Apollo credit or send email.
 */
const ApolloCreditFirewallPanel = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["apollo-credit-firewall-status"],
    refetchInterval: 60000,
    queryFn: async () => {
      const [status, accounts, candidates] = await Promise.all([
        supabase.rpc("apollo_credit_status"),
        supabase
          .from("strategic_target_accounts")
          .select("id", { count: "exact", head: true })
          .like("source_key", "education_152_master:%"),
        supabase
          .from("relationship_intelligence_contacts")
          .select("id", { count: "exact", head: true })
          .eq("research_program_key", "education_152_master_2026_09"),
      ]);
      return {
        policy: (status.data ?? null) as Record<string, any> | null,
        accountCount: accounts.count ?? 0,
        candidateCount: candidates.count ?? 0,
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
          Apollo Credit Firewall
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

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Database className="h-3 w-3" /> Education master accounts</p>
            <p className="text-lg font-semibold tabular-nums">{data.accountCount}</p>
            <p className="text-[11px] text-muted-foreground">{data.accountCount === 0 ? "Universe not yet imported" : "Research only — not outreach-eligible"}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Users className="h-3 w-3" /> Education research candidates</p>
            <p className="text-lg font-semibold tabular-nums">{data.candidateCount}</p>
            <p className="text-[11px] text-muted-foreground">Free search only · no email revealed</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Every paid Apollo request must first obtain an atomic reservation from this firewall. With paid
          enrichment off or the hard limit at zero, no paid request can be made from anywhere in the portfolio.
          This panel is read-only: nothing here spends credits or sends email.
        </p>
      </CardContent>
    </Card>
  );
};

export default ApolloCreditFirewallPanel;
