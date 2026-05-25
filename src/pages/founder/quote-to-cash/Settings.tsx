import { QTCLayout, QTCSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function QTCSettings() {
  return (
    <QTCLayout title="Settings" subtitle="Provider wiring for invoices and payments. No external mutation is performed by Liftor until a provider is configured and founder approval rules allow.">
      <QTCSection title="Provider status" description="Stripe / invoice / contract / e-signature integrations.">
        <div className="space-y-2 text-xs">
          {[
            ["Payment provider (Stripe)", "not configured"],
            ["Invoice provider", "not configured"],
            ["Contract / e-signature", "not configured"],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between p-2 rounded border border-border/50">
              <span>{k}</span>
              <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" />{v}</Badge>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-2">Connect providers later from Lovable Cloud → Connectors. Until then, sends, charges and signatures remain manual and approval-gated.</p>
        </div>
      </QTCSection>
      <QTCSection title="Approval rules">
        <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
          <li>Quotes default to <code>founder_approval_required = true</code>.</li>
          <li>Proposals default to <code>founder_approval_required = true</code>.</li>
          <li>Invoices default to <code>founder_approval_required = true</code>.</li>
          <li>Payments are confirmed only on real provider webhook or manual founder verification.</li>
          <li>Test rows tagged <code>LIVE_INTERNAL_TEST</code> never create a confirmed revenue row.</li>
        </ul>
      </QTCSection>
    </QTCLayout>
  );
}