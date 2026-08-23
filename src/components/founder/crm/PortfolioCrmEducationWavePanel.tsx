import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Layers3 } from "lucide-react";
import RelationshipIntelligencePromotionPanel from "./RelationshipIntelligencePromotionPanel";

const reuseExamples = [
  ["Education products", "CEO, Head, Education Director"],
  ["Procitron", "Procurement Director, COO, Finance"],
  ["Nexara", "CIO, IT Director"],
  ["Governexa", "Governance, Risk, Compliance"],
  ["Velocity", "Marketing, Communications"],
  ["Wise Wise Library", "HR, L&D, People"],
  ["Kinetiva", "Estates, Facilities, Sustainability"],
];

export default function PortfolioCrmEducationWavePanel() {
  return (
    <div className="space-y-4">
      <Card className="tech-card border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Education — Wave 1
            </CardTitle>
            <Badge>First shared-data cohort</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <p className="text-muted-foreground">
            Education data is a portfolio asset, not a list owned by one product. The first launch cohort uses it first; every other relevant Liftor business can reuse the same organisations and different decision-makers later.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {reuseExamples.map(([business, roles]) => (
              <div key={business} className="rounded-md border border-border/60 p-2.5">
                <div className="font-medium flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5 text-primary" />{business}</div>
                <div className="text-muted-foreground mt-1">{roles}</div>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="font-medium">Release rule</div>
            <div className="text-muted-foreground mt-1">
              Finish the Education dataset once, promote approved people once, attach the four launch businesses through business relationships, then reuse the same organisations for secondary propositions instead of buying the people again.
            </div>
          </div>
        </CardContent>
      </Card>
      <RelationshipIntelligencePromotionPanel />
    </div>
  );
}
