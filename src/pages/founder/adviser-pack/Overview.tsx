import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APLayout, APSection, APStat, NoAutoAdviserBanner } from "./_shared";
import { computeAdviserPackSnapshot, fmtMoney, type AdviserPackSnapshot } from "@/lib/adviserPackEngine";

export default function AdviserPackOverview() {
  const [snap, setSnap] = useState<AdviserPackSnapshot | null>(null);
  useEffect(() => { computeAdviserPackSnapshot().then(setSnap); }, []);

  if (!snap) return <APLayout title="Overview"><p className="text-xs text-muted-foreground">Compiling adviser pack posture…</p></APLayout>;

  return (
    <APLayout title="Overview" subtitle="Adviser-ready monthly packs across UK / US / UAE entities. Pulls confirmed revenue from Quote-to-Cash, AI spend from the usage ledger, and vendor/SaaS costs. Sending packs and tax/legal questions to advisers is approval-gated.">
      <NoAutoAdviserBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <APStat label="Packs total" value={snap.packs_total} hint={snap.current_period_label} />
        <APStat label="Draft" value={snap.packs_draft} tone={snap.packs_draft > 0 ? "warn" : "good"} />
        <APStat label="Review required" value={snap.packs_review_required} tone={snap.packs_review_required > 0 ? "warn" : "good"} />
        <APStat label="Approved / sent" value={snap.packs_approved + snap.packs_sent} tone="good" />
      </div>

      <APSection title="Adviser Pack Agent" description="Prepares the monthly pack, flags missing documents, summarises AI/tool spend, drafts adviser questions and flags tax/legal-sensitive items. Never emails advisers automatically.">
        <p className="text-sm">{snap.recommended_action}</p>
      </APSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <APStat label="Confirmed revenue 30d" value={fmtMoney(snap.confirmed_revenue_30d)} tone="good" />
        <APStat label="Estimated revenue 30d" value={fmtMoney(snap.estimated_revenue_30d)} hint="Excluded from filings" />
        <APStat label="AI spend 30d (USD)" value={fmtMoney(snap.ai_spend_30d, "USD")} />
        <APStat label="Active entities" value={snap.entities_active} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <APStat label="Items flagged for adviser" value={snap.items_review} tone={snap.items_review > 0 ? "warn" : "good"} />
        <APStat label="Questions open" value={snap.questions_open} tone={snap.questions_open > 0 ? "warn" : "good"} />
        <APStat label="Questions approved to send" value={snap.questions_approved} tone={snap.questions_approved > 0 ? "warn" : "good"} hint="Awaiting founder send" />
        <APStat label="Pack items total" value={snap.items_total} />
      </div>

      <APSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Monthly Pack", "/founder/adviser-pack/monthly"],
            ["Entities", "/founder/adviser-pack/entities"],
            ["Revenue", "/founder/adviser-pack/revenue"],
            ["Expenses", "/founder/adviser-pack/expenses"],
            ["Documents", "/founder/adviser-pack/documents"],
            ["Questions", "/founder/adviser-pack/questions"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </APSection>
    </APLayout>
  );
}