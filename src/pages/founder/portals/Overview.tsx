import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, Lock } from "lucide-react";
import { PortalsLayout, PortalStat } from "./_shared";
import { fetchPortalProfiles, fetchPortalUsers, fetchPortalInvites, fetchPortalEvents, summarize, STATUS_META, PORTAL_TYPE_META, type PortalSummary, type PortalProfile } from "@/lib/portalsEngine";

export default function PortalsOverview() {
  const [profiles, setProfiles] = useState<PortalProfile[]>([]);
  const [sum, setSum] = useState<PortalSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchPortalProfiles(), fetchPortalUsers(), fetchPortalInvites(), fetchPortalEvents()])
      .then(([p, u, i, e]) => { setProfiles(p); setSum(summarize(p, u, i, e)); })
      .catch(() => setSum(null));
  }, []);
  return (
    <PortalsLayout title="External Portals Overview" subtitle="Architecture for future customer, seller, partner, adviser and document upload portals. Everything stays internal_only by default — no public exposure, no invites sent.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <PortalStat label="Profiles" value={sum?.total_profiles ?? "—"} />
        <PortalStat label="Live" value={sum?.live ?? "—"} />
        <PortalStat label="Internal only" value={sum?.internal_only ?? "—"} />
        <PortalStat label="Active users" value={sum?.active_users ?? "—"} />
        <PortalStat label="Approval pending" value={sum?.approval_pending ?? "—"} tone={(sum?.approval_pending ?? 0) > 0 ? "warn" : "ok"} />
        <PortalStat label="Suspicious events" value={sum?.suspicious_events ?? "—"} tone={(sum?.suspicious_events ?? 0) > 0 ? "bad" : "ok"} />
      </div>
      {(sum?.risk_warnings.length ?? 0) > 0 && (
        <Card className="tech-card border-red-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle size={14} className="text-red-400" /> Portal risk warnings</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {sum!.risk_warnings.map((w, i) => <p key={i} className="text-red-300">• {w}</p>)}
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Portal profiles</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {profiles.length === 0 && <p className="text-muted-foreground">No portal profiles yet. The Portal Access Agent will recommend setups by business type.</p>}
          {profiles.map(p => {
            const sm = STATUS_META[p.portal_status];
            const tm = PORTAL_TYPE_META[p.portal_type];
            return (
              <div key={p.id} className="border border-border/50 rounded p-3 space-y-1 hover:border-primary/40 transition">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{tm.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.access_mode}</Badge>
                  {p.requires_founder_approval_for_invites && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Approval-gated invites</Badge>}
                  {p.audit_metadata?.label === "LIVE_INTERNAL_TEST" && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
                </div>
                <p className="text-sm font-medium">{p.portal_name}</p>
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <Link to={`/founder/portals/${p.portal_type === "document_upload" ? "document-upload" : p.portal_type}`} className="text-primary hover:underline">Manage →</Link>
                  <span>Placeholder route: {tm.route}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Portal configuration checklist</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Each live portal must have invite approval enabled</p>
          <p>• No portal shows documents without an explicit access check</p>
          <p>• Every portal view enforces business + role scope</p>
          <p>• No raw secrets or admin data exposed to external users</p>
          <p>• Invite links are tokenised and expire</p>
          <p>• Suspicious/expired access events surface in the Command Centre</p>
        </CardContent>
      </Card>
    </PortalsLayout>
  );
}