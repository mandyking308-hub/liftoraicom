import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Workflow, ArrowRight } from "lucide-react";

interface Pillar { label: string; to: string; live: string; gated: string }

const PILLARS: Pillar[] = [
  { label: "Customer Sales", to: "/founder/customer-sales", live: "Conversations, intents, voice console, objections, follow-up.", gated: "Sending price changes, public statements, contracts." },
  { label: "Revenue Autopilot", to: "/founder/revenue-autopilot", live: "Daily target gap, pipeline math, recommended sales/close actions.", gated: "Pausing sales, discount approvals, customer outreach." },
  { label: "Upgrade Engine", to: "/founder/customer-upgrades", live: "Upsell, cross-sell, renewal signals and drafts.", gated: "Sending upgrade offers and price changes." },
  { label: "Quote-to-Cash", to: "/founder/quote-to-cash", live: "Quotes, invoices, payment matching, revenue confirmation drafts.", gated: "Issuing invoices, recording refunds, writing off revenue." },
  { label: "Delivery / Fulfilment", to: "/founder/delivery", live: "Delivery tasks, blockers, at-risk timelines.", gated: "Changing delivery dates, cancelling work, customer notices." },
  { label: "Customer Onboarding", to: "/founder/customer-onboarding", live: "Welcome packs, checklists, missing info detection.", gated: "Sending welcome packs and customer comms." },
  { label: "Support SLA", to: "/founder/support", live: "Tickets, SLA timers, knowledge suggestions.", gated: "Public responses, refund offers, compensation." },
  { label: "Complaints / Refunds", to: "/founder/complaints", live: "Complaint logging, refund triage, evidence packs.", gated: "Issuing refunds, dispute responses, customer messages." },
  { label: "Contracts", to: "/founder/contracts", live: "Contract registry, renewal calendar, risk flags.", gated: "Sending, signing, renewing or terminating contracts." },
  { label: "Vendor / SaaS", to: "/founder/vendors", live: "Vendor inventory, cost trends, renewal calendar, risk.", gated: "Renewing, cancelling or changing provider terms." },
  { label: "People / Ops", to: "/founder/people", live: "Operator workload, overdue tasks, quality scores.", gated: "Hiring, firing, role/access changes, payroll." },
  { label: "Access / Secrets", to: "/founder/access-governance", live: "Access inventory, secret age, leak detection.", gated: "Rotating, granting or revoking access; secret changes." },
  { label: "Privacy / DSAR", to: "/founder/privacy", live: "DSAR queue, retention, breach drafts.", gated: "Customer notices, regulator notifications, deletions." },
  { label: "Incidents / Continuity", to: "/founder/incidents", live: "Incident log, triage, postmortem drafts.", gated: "Customer/regulator notices, public statements, provider mutations." },
  { label: "Adviser Pack", to: "/founder/adviser-pack", live: "Monthly pack, document checklist, AI spend summary.", gated: "Adviser emails, filings, payments, entity changes." },
  { label: "Founder Reporting", to: "/founder/reports", live: "Weekly + monthly operating reports across all businesses.", gated: "External sharing of reports." },
  { label: "Product / QA / Release", to: "/founder/product", live: "Features, bugs, QA checklists, release notes drafts.", gated: "Production deploys, customer messages, announcements." },
  { label: "Data Quality", to: "/founder/data-quality", live: "Duplicates, test data, orphans, stale & revenue integrity.", gated: "Bulk deletes, merges, irreversible repairs." },
  { label: "Knowledge Governance", to: "/founder/knowledge-governance", live: "Source trust, conflicts, stale detection, approved claims.", gated: "Editing pricing, legal, compliance claims and manuals." },
  { label: "Capacity / Workload", to: "/founder/capacity", live: "Capacity plans, workload board, bottleneck alerts, forecast.", gated: "Pausing sales, changing availability, customer outreach." },
];

export default function BusinessProcessSpineManualPanel() {
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Workflow size={18} className="text-primary" />
          Whole Business Process Spine
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live-first</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">
          Liftor runs every business as a connected spine of 20 process engines. Daily operations run live; only
          customer-impacting, regulatory or irreversible actions are approval-gated inside each module.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PILLARS.map((p) => (
            <Link key={p.to} to={p.to} className="rounded border border-border/40 p-3 hover:border-primary/60 transition block">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-medium text-foreground">{p.label}</p>
                <ArrowRight size={11} className="text-primary" />
              </div>
              <p className="text-muted-foreground"><span className="text-emerald-400">Live:</span> {p.live}</p>
              <p className="text-muted-foreground mt-1"><span className="text-yellow-400">Approval-gated:</span> {p.gated}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}