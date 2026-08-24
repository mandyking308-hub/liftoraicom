import { Link } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import BillionaireAccessResearchPanel from "@/components/founder/crm/BillionaireAccessResearchPanel";
import { Button } from "@/components/ui/button";

const BillionaireAccessResearch = () => (
  <FounderLayout>
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Billionaire Access</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The complete institutional-access research layer inside the Liftor founder CRM.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/founder/crm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CRM
          </Link>
        </Button>
      </div>
      <BillionaireAccessResearchPanel />
    </div>
  </FounderLayout>
);

export default BillionaireAccessResearch;
