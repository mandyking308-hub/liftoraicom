import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function SmartleadScaleNextActionBanner() {
  return <Card className="p-4 space-y-2">
    <h3 className="font-semibold">Prepare the sending mailboxes</h3>
    <p className="text-sm text-muted-foreground">The rollout uses Winnr for mailboxes and Smartlead for prospect data and campaigns. Connection and warmup status must come from a current account check.</p>
    <Link to="/founder/command-centre#smartlead-scale-setup-checklist" className="text-sm underline">Open the business mailbox plan and connection check</Link>
  </Card>;
}
