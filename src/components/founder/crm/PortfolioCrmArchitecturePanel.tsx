import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Database, Building2, UserRound, Network, ShieldCheck } from "lucide-react";
import { PORTFOLIO_CRM_PIPELINE, PORTFOLIO_CRM_PRINCIPLES } from "@/lib/portfolioCrmModel";

const iconFor = (label: string) => {
  if (label === "Data Asset" || label === "Buyer Pool") return Database;
  if (label === "Organisation") return Building2;
  if (label === "Person") return UserRound;
  if (label === "Business Relevance" || label === "Campaign Eligibility") return Network;
  return ShieldCheck;
};

export default function PortfolioCrmArchitecturePanel() {
  return (
    <Card className="tech-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Portfolio CRM model</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              One person and one organisation record can serve multiple Liftor businesses. Business-specific qualification and outreach remain separate.
            </p>
          </div>
          <Badge variant="outline">Shared-data architecture</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {PORTFOLIO_CRM_PIPELINE.map((step, index) => {
            const Icon = iconFor(step);
            return (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span>{step}</span>
                </div>
                {index < PORTFOLIO_CRM_PIPELINE.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="font-medium mb-2">Source of truth</p>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-foreground">Person:</span> {PORTFOLIO_CRM_PRINCIPLES.personTruth}</p>
              <p><span className="text-foreground">Business relevance:</span> {PORTFOLIO_CRM_PRINCIPLES.businessRelationshipTruth}</p>
              <p><span className="text-foreground">Research/evidence:</span> {PORTFOLIO_CRM_PRINCIPLES.researchTruth}</p>
              <p><span className="text-foreground">Legacy only:</span> {PORTFOLIO_CRM_PRINCIPLES.legacySingleBusinessField}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="font-medium mb-2">Operating rule</p>
            <p className="text-muted-foreground">
              Dataset imports never send. Approved people are deduplicated into the master CRM, then linked to every genuinely relevant business with independent qualification, campaign eligibility and suppression.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
