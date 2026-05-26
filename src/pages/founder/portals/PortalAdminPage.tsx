import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { PortalsLayout } from "./_shared";
import { fetchPortalProfiles, fetchPortalUsers, fetchPortalInvites, STATUS_META, type PortalProfile, type PortalUser, type PortalInvite, type PortalType } from "@/lib/portalsEngine";

export default function PortalAdminPage({ type, title, subtitle, checklist }: { type: PortalType; title: string; subtitle: string; checklist: string[] }) {
  const [profiles, setProfiles] = useState<PortalProfile[]>([]);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [invites, setInvites] = useState<PortalInvite[]>([]);
  useEffect(() => {
    fetchPortalProfiles({ type }).then(setProfiles);
    fetchPortalUsers().then(setUsers);
    fetchPortalInvites().then(setInvites);
  }, [type]);
  const profileIds = new Set(profiles.map(p => p.id));
  const scopedUsers = users.filter(u => profileIds.has(u.portal_profile_id));
  const scopedInvites = invites.filter(i => profileIds.has(i.portal_profile_id));
  return (
    <PortalsLayout title={title} subtitle={subtitle}>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Profiles</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {profiles.length === 0 && <p className="text-muted-foreground">No {type} portal profiles yet.</p>}
          {profiles.map(p => {
            const sm = STATUS_META[p.portal_status];
            return (
              <div key={p.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.access_mode}</Badge>
                  {p.requires_founder_approval_for_invites && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Approval-gated</Badge>}
                </div>
                <p className="text-sm font-medium">{p.portal_name}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Portal users</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {scopedUsers.length === 0 && <p className="text-muted-foreground">No users provisioned yet.</p>}
          {scopedUsers.map(u => (
            <div key={u.id} className="border border-border/50 rounded p-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{u.access_status}</Badge>
              <Badge variant="outline" className="text-[10px]">{u.portal_role}</Badge>
              <span className="text-sm">{u.display_name ?? u.email}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{u.email}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Invite drafts</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {scopedInvites.length === 0 && <p className="text-muted-foreground">No invite drafts. The Portal Access Agent prepares drafts but nothing sends without founder approval.</p>}
          {scopedInvites.map(i => (
            <div key={i.id} className="border border-border/50 rounded p-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{i.invite_status}</Badge>
              <span className="text-sm">{i.invitee_email}</span>
              <Badge variant="outline" className="ml-auto text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Send requires approval</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Configuration checklist</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          {checklist.map(c => <p key={c}>• {c}</p>)}
        </CardContent>
      </Card>
    </PortalsLayout>
  );
}
