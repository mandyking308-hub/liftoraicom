import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchLaunchProfiles, fetchChecklist, fetchChannelAccounts, diagnoseLaunch,
  type LaunchProfileRow, type ChecklistItemRow, type ChannelAccountRow,
} from "@/lib/launchFactoryEngine";

export default function LaunchFactoryCard() {
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [channels, setChannels] = useState<ChannelAccountRow[]>([]);
  useEffect(() => {
    fetchLaunchProfiles().then(setProfiles).catch(() => {});
    fetchChecklist().then(setItems).catch(() => {});
    fetchChannelAccounts().then(setChannels).catch(() => {});
  }, []);
  const warnings = profiles.flatMap(p => diagnoseLaunch(p, items.filter(i => i.business_id === p.business_id)));
  const approvals = items.filter(i => i.item_status === "approval_required").length;
  const missing = items.filter(i => i.item_status === "missing").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Rocket size={14} className="text-primary" />
          Launch Factory
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Launch profiles" value={profiles.length} />
          <Stat label="Channel accounts" value={channels.length} />
          <Stat label="Missing items" value={missing} />
          <Stat label="Awaiting approval" value={approvals} />
        </div>
        {warnings.length > 0 && <p className="text-yellow-400">{warnings.length} launch warning{warnings.length === 1 ? "" : "s"} across portfolio.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/launch-factory" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/launch-factory/checklist" className="text-primary hover:underline">Checklist</Link>
          <Link to="/founder/launch-factory/domains" className="text-primary hover:underline">Domains</Link>
          <Link to="/founder/launch-factory/email" className="text-primary hover:underline">Email</Link>
          <Link to="/founder/launch-factory/socials" className="text-primary hover:underline">Socials</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}