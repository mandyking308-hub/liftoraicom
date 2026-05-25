import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CTRLayout, CTRSection, CTRStat } from "./_shared";
import { computeContractsSnapshot, type ContractsSnapshot } from "@/lib/contractsEngine";

export default function ContractsOverview() {
  const [snap, setSnap] = useState<ContractsSnapshot | null>(null);
  useEffect(() => { computeContractsSnapshot().then(setSnap); }, []);

  if (!snap) return <CTRLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating contract load…</p></CTRLayout>;

  return (
    <CTRLayout title="Overview" subtitle="Track contracts, terms, renewals, obligations, signatures, expiry, risk and provider handoff. Drafts are prepared internally; sending, signing, termination and legal wording changes require founder/legal approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CTRStat label="Total contracts" value={snap.total} />
        <CTRStat label="Active" value={snap.active} tone="good" />
        <CTRStat label="Drafts" value={snap.drafts} />
        <CTRStat label="Awaiting approval" value={snap.awaiting_approval} tone={snap.awaiting_approval > 0 ? "warn" : "good"} />
      </div>

      <CTRSection title="Contract Agent" description="Tracks contracts, flags renewals, summarises obligations, prepares draft language, identifies risks and escalates legal review.">
        <p className="text-sm">{snap.recommended_action}</p>
      </CTRSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CTRStat label="Awaiting signature" value={snap.awaiting_signature} tone={snap.awaiting_signature > 0 ? "warn" : "good"} />
        <CTRStat label="Renewals (30d)" value={snap.renewals_30d} tone={snap.renewals_30d > 0 ? "warn" : "good"} />
        <CTRStat label="Expiring (30d)" value={snap.expiring_30d} tone={snap.expiring_30d > 0 ? "warn" : "good"} />
        <CTRStat label="Overdue obligations" value={snap.obligations_overdue} tone={snap.obligations_overdue > 0 ? "bad" : "good"} hint={`${snap.obligations_open} open · ${snap.high_risk} high-risk`} />
      </div>

      <CTRSection title="Safety rules" description="Hard-wired into the Contract Lifecycle Engine.">
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Contracts are never sent, signed, renewed or terminated automatically.</li>
          <li>Every legal wording change requires founder/legal approval.</li>
          <li>Obligations are extracted from terms and assigned an owner and due date.</li>
          <li>Renewals and expirations raise warnings 30 days ahead.</li>
          <li>High-risk clauses are escalated for legal review.</li>
        </ul>
      </CTRSection>

      <CTRSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Drafts", "/founder/contracts/drafts"],
            ["Signature", "/founder/contracts/signature"],
            ["Obligations", "/founder/contracts/obligations"],
            ["Renewals", "/founder/contracts/renewals"],
            ["Risk", "/founder/contracts/risk"],
            ["Settings", "/founder/contracts/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </CTRSection>
    </CTRLayout>
  );
}