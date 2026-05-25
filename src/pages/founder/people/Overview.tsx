import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PPLLayout, PPLSection, PPLStat, PPLEmpty, PPL_ROLE_TONE, PPL_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { computePeopleSnapshot, type PeopleSnapshot } from "@/lib/peopleEngine";
import { supabase } from "@/integrations/supabase/client";

export default function PeopleOverview() {
  const [snap, setSnap] = useState<PeopleSnapshot | null>(null);
  const [ops, setOps] = useState<any[] | null>(null);
  useEffect(() => {
    computePeopleSnapshot().then(setSnap);
    (supabase as any).from("human_operators")
      .select("id,name,email,role_type,organisation,status,nda_status,contract_status,timezone")
      .order("name").limit(100)
      .then(({ data }: any) => setOps(data ?? []));
  }, []);

  if (!snap) return <PPLLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating people operations…</p></PPLLayout>;

  return (
    <PPLLayout title="Overview" subtitle="Operating layer for human helpers — VAs, agencies, contractors, advisers, employees, backups and oversight teams. Internal planning and draft tasks run live. Access grants, invitations, payroll and external messages are approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PPLStat label="Operators" value={snap.operators_total} hint={`${snap.operators_active} active · ${snap.operators_proposed} proposed`} />
        <PPLStat label="Open tasks" value={snap.tasks_open} hint={`${snap.tasks_blocked} blocked`} tone={snap.tasks_blocked > 0 ? "warn" : "default"} />
        <PPLStat label="Overdue tasks" value={snap.tasks_overdue} tone={snap.tasks_overdue > 0 ? "bad" : "good"} />
        <PPLStat label="Pending approval" value={snap.tasks_pending_approval} tone={snap.tasks_pending_approval > 0 ? "warn" : "good"} />
      </div>

      <PPLSection title="Human Oversight Agent" description="Prepares tasks for VAs and humans, flags access gaps, flags overdue work, tracks quality, creates handover notes and suggests escalation. Never grants access. Never sends external messages.">
        <p className="text-sm">{snap.recommended_action}</p>
      </PPLSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PPLStat label="Access requests" value={snap.access_requested} tone={snap.access_requested > 0 ? "warn" : "good"} />
        <PPLStat label="Active access" value={snap.access_active} />
        <PPLStat label="Access expiring 30d" value={snap.access_expiring_30d} tone={snap.access_expiring_30d > 0 ? "warn" : "good"} />
        <PPLStat label="Quality reviews 30d" value={snap.quality_reviews_30d} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PPLStat label="Missing NDA" value={snap.operators_missing_nda} tone={snap.operators_missing_nda > 0 ? "warn" : "good"} hint="Active operators without an NDA on file" />
        <PPLStat label="Missing contract" value={snap.operators_missing_contract} tone={snap.operators_missing_contract > 0 ? "warn" : "good"} hint="Active operators without a contract on file" />
      </div>

      <PPLSection title="Operator roster">
        {!ops ? <p className="text-xs text-muted-foreground">Loading…</p>
          : ops.length === 0 ? <PPLEmpty title="No human operators yet" hint="Add founders, VAs, agencies, contractors, advisers, employees and backups to start planning tasks, access and oversight." />
          : (
            <div className="space-y-2">
              {ops.map((o) => (
                <div key={o.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{o.name}</span>
                    <Badge variant="outline" className={PPL_ROLE_TONE[o.role_type] || ""}>{o.role_type}</Badge>
                    <Badge variant="outline" className={PPL_STATUS_TONE[o.status] || ""}>{o.status}</Badge>
                    {o.organisation && <Badge variant="outline">{o.organisation}</Badge>}
                    {o.timezone && <Badge variant="outline" className="bg-muted text-muted-foreground">{o.timezone}</Badge>}
                  </div>
                  <p className="text-muted-foreground">{o.email} · NDA: {o.nda_status} · Contract: {o.contract_status}</p>
                </div>
              ))}
            </div>
          )}
      </PPLSection>

      <PPLSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Operators", "/founder/people/operators"],
            ["Tasks", "/founder/people/tasks"],
            ["Access", "/founder/people/access"],
            ["Training", "/founder/people/training"],
            ["Quality", "/founder/people/quality"],
            ["Handover", "/founder/people/handover"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </PPLSection>
    </PPLLayout>
  );
}