import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
  Building2, Server, Users, AlertTriangle, FileText, Activity, CheckCircle2,
  XCircle, Clock, Plus, Upload, ArrowLeft,
} from "lucide-react";

const statusIcon = (s: string) => {
  if (["operational", "active", "connected"].includes(s)) return <CheckCircle2 size={14} className="text-green-400" />;
  if (["warning", "degraded", "inactive"].includes(s)) return <Clock size={14} className="text-yellow-400" />;
  if (["offline", "error"].includes(s)) return <XCircle size={14} className="text-destructive" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusClass = (s: string) => {
  if (["operational", "active", "connected"].includes(s)) return "bg-green-500/20 text-green-400";
  if (["warning", "degraded", "inactive"].includes(s)) return "bg-yellow-500/20 text-yellow-400";
  if (["offline", "error"].includes(s)) return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
};

const OrganisationProfile = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [memberDialog, setMemberDialog] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: "", role: "viewer" });
  const [docDialog, setDocDialog] = useState(false);

  const { data: org } = useQuery({
    queryKey: ["organisation", id],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["org-systems", id],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("*, automation_workflows(id), ai_agents(id)").eq("organisation_id", id!);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", id],
    queryFn: async () => {
      const { data } = await supabase.from("organisation_members").select("*, profiles:user_id(full_name, company_name)").eq("organisation_id", id!);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["org-documents", id],
    queryFn: async () => {
      const { data } = await supabase.from("organisation_documents").select("*").eq("organisation_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["org-alerts", id],
    queryFn: async () => {
      const sysIds = systems.map((s: any) => s.id);
      if (!sysIds.length) return [];
      const { data } = await supabase.from("system_alerts").select("*, monitored_systems(system_name)").in("system_id", sysIds).eq("resolved", false).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: systems.length > 0,
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ["org-activity", id],
    queryFn: async () => {
      const sysIds = systems.map((s: any) => s.id);
      if (!sysIds.length) return [];
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name), monitored_systems(system_name)").in("system_id", sysIds).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: systems.length > 0,
  });

  const agentCount = systems.reduce((acc: number, s: any) => acc + (s.ai_agents?.length || 0), 0);
  const workflowCount = systems.reduce((acc: number, s: any) => acc + (s.automation_workflows?.length || 0), 0);

  const handleAddMember = async () => {
    if (!memberForm.email.trim()) { toast.error("Email is required"); return; }
    // Look up user by email — we need to find their auth user id via profiles
    // For now, store placeholder; in production this would resolve the user
    toast.info("Member invitation would be sent to " + memberForm.email);
    setMemberDialog(false);
    setMemberForm({ email: "", role: "viewer" });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("organisation-documents").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { error } = await supabase.from("organisation_documents").insert({ organisation_id: id, name: file.name, file_path: filePath, file_size: file.size });
    if (error) { toast.error(error.message); return; }
    toast.success("Document uploaded");
    qc.invalidateQueries({ queryKey: ["org-documents", id] });
    setDocDialog(false);
  };

  if (!org) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/founder/organisations"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 size={24} className="text-primary" /> {org.name}</h1>
            <p className="text-muted-foreground text-sm">{org.industry || "—"} · {org.primary_contact || "No contact"}</p>
          </div>
          <Badge variant="secondary" className={`ml-auto ${statusClass(org.status)}`}>{org.status}</Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Systems", value: systems.length, icon: Server },
            { label: "Users", value: members.length, icon: Users },
            { label: "Workflows", value: workflowCount, icon: Activity },
            { label: "Agents", value: agentCount, icon: Activity },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <s.icon size={18} className="text-primary mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Systems */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Server size={18} /> Systems</CardTitle></CardHeader>
          <CardContent>
            {systems.length === 0 ? <p className="text-muted-foreground text-sm">No systems assigned.</p> : (
              <div className="space-y-2">
                {systems.map((s: any) => (
                  <Link key={s.id} to={`/founder/monitoring/${s.id}`}>
                    <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(s.status)}
                          <div>
                            <p className="text-sm font-medium">{s.system_name}</p>
                            <p className="text-xs text-muted-foreground">{s.automation_workflows?.length || 0} workflows · {s.ai_agents?.length || 0} agents</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-xs ${statusClass(s.status)}`}>{s.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Users */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><Users size={18} /> Users</CardTitle>
                <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Email</Label><Input value={memberForm.email} onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))} /></div>
                      <div>
                        <Label>Role</Label>
                        <Select value={memberForm.role} onValueChange={v => setMemberForm(p => ({ ...p, role: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrator">Administrator</SelectItem>
                            <SelectItem value="operations">Operations User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddMember} className="w-full">Add Member</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? <p className="text-muted-foreground text-sm">No members.</p> : (
                <div className="space-y-2">
                  {members.map((m: any) => (
                    <div key={m.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{(m.profiles as any)?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                        </div>
                        <Badge variant="secondary" className={statusClass(m.status)}>{m.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle size={18} /> Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={16} className="text-green-400" /> No active alerts</div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.monitored_systems?.system_name}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={`text-xs ${a.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"}`}>{a.severity}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Documents */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><FileText size={18} /> Documents</CardTitle>
                <Dialog open={docDialog} onOpenChange={setDocDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Upload size={14} className="mr-1" /> Upload</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                    <Input type="file" onChange={handleDocUpload} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? <p className="text-muted-foreground text-sm">No documents.</p> : (
                <div className="space-y-2">
                  {documents.map((d: any) => (
                    <div key={d.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.category} · {d.file_size ? `${(d.file_size / 1024).toFixed(0)} KB` : "—"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity size={18} /> Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {activityLog.length === 0 ? <p className="text-muted-foreground text-sm">No recent activity.</p> : (
                <div className="space-y-2">
                  {activityLog.map((e: any) => (
                    <div key={e.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{e.automation_workflows?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{e.monitored_systems?.system_name}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={`text-xs ${statusClass(e.status)}`}>{e.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.created_at), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FounderLayout>
  );
};

export default OrganisationProfile;
