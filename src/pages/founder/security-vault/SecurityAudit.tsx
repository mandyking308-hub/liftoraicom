import { SVLayout, SVCard, CheckList, ApprovalBoundary, VAULT_APPROVAL_GATES } from "./_shared";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { SECURITY_AUDIT_CHECKLIST } from "@/lib/securityVaultData";

const MANUAL_DRAFTS = [
  "Security Vault Manual",
  "Backup and Restore Runbook",
  "Secrets Register Runbook",
  "Build Snapshot Runbook",
  "Founder Security Checklist",
  "Technical Manual — Security section",
];

export default function SecurityAudit() {
  return (
    <SVLayout title="Security Audit Checklist" subtitle="Review and tick off before scaling operations. This page does not modify any system — it is a founder review surface.">
      <SVCard title="Audit checklist" icon={ClipboardCheck}>
        <CheckList items={SECURITY_AUDIT_CHECKLIST} />
      </SVCard>

      <SVCard title="Manuals to draft via manual_update_drafts" icon={ShieldCheck}>
        <CheckList items={MANUAL_DRAFTS} />
        <p className="text-[11px] text-muted-foreground mt-2">Manuals are never silently overwritten. Each draft goes through the existing founder-review workflow.</p>
      </SVCard>

      <Card className="tech-card p-4 text-xs space-y-2">
        <p className="font-semibold">Engine guarantees</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>No outbound, no paid APIs, no publishing triggered from this module.</li>
          <li>No raw secrets are read, displayed or stored.</li>
          <li>All founder approval gates remain enforced.</li>
          <li>Legal/IP restrictions on competitor data, branding, code and customer lists remain in force.</li>
        </ul>
      </Card>

      <ApprovalBoundary items={VAULT_APPROVAL_GATES} />
    </SVLayout>
  );
}