import { JTLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function JTSettings() {
  const live = [
    "Track invoice/payment currency",
    "Track customer/seller/vendor/entity country",
    "Flag unknown jurisdiction",
    "Flag possible VAT / sales-tax / withholding / marketplace tax review",
    "Label FX estimated vs verified",
    "Prepare adviser questions and queue",
    "Warn when selling globally without enough jurisdiction data",
  ];
  const gated = [
    "Provide final tax / legal advice",
    "File tax returns or registrations",
    "Change entity routing",
    "Send adviser or customer communications",
    "Bulk overwrite customer country / tax ID",
    "Activate live VAT / sales-tax collection on checkout",
  ];
  return (
    <JTLayout title="Settings" subtitle="What runs live versus what stays gated.">
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="tech-card border-emerald-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Live (internal tracking)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {live.map(l => <p key={l}><Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 mr-2">Live</Badge>{l}</p>)}
          </CardContent>
        </Card>
        <Card className="tech-card border-yellow-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock size={12} /> Approval gated</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {gated.map(l => <p key={l}><Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 mr-2">Gated</Badge>{l}</p>)}
          </CardContent>
        </Card>
      </div>
    </JTLayout>
  );
}