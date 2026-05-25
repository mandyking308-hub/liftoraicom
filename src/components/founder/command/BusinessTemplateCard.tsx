import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchApplications, fetchSetupTasks, fetchTemplates, type ApplicationRow, type SetupTaskRow, type TemplateRow } from "@/lib/businessTemplateFactory";

export default function BusinessTemplateCard() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [tasks, setTasks] = useState<SetupTaskRow[]>([]);
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
    fetchApplications().then(setApps).catch(() => {});
    fetchSetupTasks().then(setTasks).catch(() => {});
  }, []);
  const open = tasks.filter(t => t.task_status === "pending" || t.task_status === "in_progress").length;
  const blocked = tasks.filter(t => t.task_status === "blocked").length;
  const founderApproval = tasks.filter(t => t.founder_action_required && t.task_status !== "completed").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Boxes size={14} className="text-primary" />
          Business Template Factory
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Templates" value={templates.length} />
          <Stat label="Applications" value={apps.length} />
          <Stat label="Open tasks" value={open} />
          <Stat label="Founder approvals" value={founderApproval} />
        </div>
        {blocked > 0 && <p className="text-yellow-400">{blocked} task{blocked === 1 ? "" : "s"} blocked.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/business-templates" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/business-templates/library" className="text-primary hover:underline">Library</Link>
          <Link to="/founder/business-templates/apply" className="text-primary hover:underline">Apply</Link>
          <Link to="/founder/business-templates/business-setup" className="text-primary hover:underline">Business setup</Link>
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