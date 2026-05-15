import FounderLayout from "@/components/founder/FounderLayout";
import { SecurityGovernancePanel } from "@/components/founder/security/SecurityGovernancePanel";
import ControlledExternalActionGatesPanel from "@/components/founder/operations/ControlledExternalActionGatesPanel";
import GlobalAutonomyControlPanel from "@/components/founder/autonomy/GlobalAutonomyControlPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
  ShieldAlert, AlertTriangle, Eye, Activity, FileText, Search, Plus,
  CheckCircle2, XCircle, Clock, Download, Upload,
} from "lucide-react";

const sevClass = (s: string) => {
  if (s === "critical") return "bg-destructive/20 text-destructive";
  if (s === "high") return "bg-orange-500/20 text-orange-400";
  if (s === "medium") return "bg-yellow-500/20 text-yellow-400";
  return "bg-muted text-muted-foreground";
};

const complianceStatusClass = (s: string) => {
  if (s === "compliant") return "bg-green-500/20 text-green-400";
  if (s === "in_review") return "bg-yellow-500/20 text-yellow-400";
  if (s === "not_reviewed") return "bg-muted text-muted-foreground";
  if (s === "non_compliant") return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
};

const SecurityDashboard = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [alertDialog, setAlertDialog] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: "", description: "", severity: "medium", alert_type: "general" });
  const [docDialog, setDocDialog] = useState(false);

  const { data: securityAlerts = [] } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("security_alerts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: anomalies = [] } = useQuery({
    queryKey: ["access-anomalies"],
    queryFn: async () => {
      const { data } = await supabase.from("access_anomalies").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["risk-indicators"],
    queryFn: async () => {
      const { data } = await supabase.from("risk_indicators").select("*").eq("status", "active").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: complianceItems = [] } = useQuery({
    queryKey: ["compliance-items"],
    queryFn: async () => {
      const { data } = await supabase.from("compliance_items").select("*").order("created_at");
      return data ?? [];
    },
  });

  const { data: complianceDocs = [] } = useQuery({
    queryKey: ["compliance-documents"],
    queryFn: async () => {
      const { data } = await supabase.from("compliance_documents").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: securityEvents = [] } = useQuery({
    queryKey: ["security-events"],
    queryFn: async () => {
      const { data } = await supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const unresolvedAlerts = securityAlerts.filter((a: any) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a: any) => a.severity === "critical");
  const flaggedAnomalies = anomalies.filter((a: any) => a.flagged);
  const compliantCount = complianceItems.filter((c: any) => c.status === "compliant").length;

  const handleCreateAlert = async () => {
    if (!alertForm.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("security_alerts").insert(alertForm);
    if (error) { toast.error(error.message); return; }
    await supabase.from("security_events").insert({ event_type: "alert_created", description: `Security alert created: ${alertForm.title}`, user_name: "Founder" });
    toast.success("Alert created");
    setAlertForm({ title: "", description: "", severity: "medium", alert_type: "general" });
    setAlertDialog(false);
    qc.invalidateQueries({ queryKey: ["security-alerts"] });
    qc.invalidateQueries({ queryKey: ["security-events"] });
  };

  const resolveAlert = async (id: string, title: string) => {
    await supabase.from("security_alerts").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("security_events").insert({ event_type: "alert_resolved", description: `Alert resolved: ${title}`, user_name: "Founder" });
    toast.success("Alert resolved");
    qc.invalidateQueries({ queryKey: ["security-alerts"] });
    qc.invalidateQueries({ queryKey: ["security-events"] });
  };

  const updateComplianceStatus = async (id: string, status: string, area: string) => {
    await supabase.from("compliance_items").update({ status, last_review_date: new Date().toISOString() }).eq("id", id);
    await supabase.from("security_events").insert({ event_type: "compliance_updated", description: `Compliance status updated: ${area} → ${status}`, user_name: "Founder" });
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["compliance-items"] });
    qc.invalidateQueries({ queryKey: ["security-events"] });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filePath = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("compliance-documents").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { error } = await supabase.from("compliance_documents").insert({ name: file.name, file_path: filePath, file_size: file.size });
    if (error) { toast.error(error.message); return; }
    toast.success("Document uploaded");
    qc.invalidateQueries({ queryKey: ["compliance-documents"] });
    setDocDialog(false);
  };

  const generateReport = () => {
    const lines = [
      "LIFTOR AI — SECURITY & COMPLIANCE REPORT",
      `Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`,
      "",
      "== SECURITY SUMMARY ==",
      `Unresolved Alerts: ${unresolvedAlerts.length}`,
      `Critical Alerts: ${criticalAlerts.length}`,
      `Flagged Anomalies: ${flaggedAnomalies.length}`,
      `Active Risk Indicators: ${risks.length}`,
      "",
      "== COMPLIANCE STATUS ==",
      ...complianceItems.map((c: any) => `  ${c.area}: ${c.status.replace(/_/g, " ")} (Last reviewed: ${c.last_review_date ? format(new Date(c.last_review_date), "MMM d, yyyy") : "Never"})`),
      `  Overall: ${compliantCount}/${complianceItems.length} compliant`,
      "",
      "== ACTIVE RISK INDICATORS ==",
      ...(risks.length ? risks.map((r: any) => `  [${r.severity.toUpperCase()}] ${r.system_name}: ${r.risk_description}`) : ["  None"]),
      "",
      "== RECENT SECURITY EVENTS ==",
      ...securityEvents.slice(0, 10).map((e: any) => `  ${format(new Date(e.created_at), "MMM d, h:mm a")} — ${e.event_type.replace(/_/g, " ")}: ${e.description}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `security-compliance-report-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const filteredEvents = securityEvents.filter((e: any) =>
    !search || e.event_type?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()) || e.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert size={24} className="text-primary" /> Security & Compliance</h1>
            <p className="text-muted-foreground text-sm mt-1">Platform security monitoring and compliance oversight</p>
          </div>
          <Button variant="outline" onClick={generateReport}><Download size={16} className="mr-2" /> Export Report</Button>
        </div>

        <SecurityGovernancePanel />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Unresolved Alerts", value: unresolvedAlerts.length, highlight: unresolvedAlerts.length > 0 },
            { label: "Critical", value: criticalAlerts.length, highlight: criticalAlerts.length > 0 },
            { label: "Anomalies", value: flaggedAnomalies.length, highlight: flaggedAnomalies.length > 0 },
            { label: "Risk Indicators", value: risks.length },
            { label: "Compliance", value: `${compliantCount}/${complianceItems.length}` },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <p className={`text-2xl font-bold ${s.highlight ? "text-destructive" : ""}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="alerts">
          <TabsList>
            <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
            <TabsTrigger value="anomalies">Access Anomalies</TabsTrigger>
            <TabsTrigger value="risks">Risk Indicators</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="events">Event Log</TabsTrigger>
          </TabsList>

          {/* Alerts */}
          <TabsContent value="alerts" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
                <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> Log Alert</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Security Alert</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title *</Label><Input value={alertForm.title} onChange={e => setAlertForm(p => ({ ...p, title: e.target.value }))} /></div>
                    <div><Label>Description</Label><Textarea value={alertForm.description} onChange={e => setAlertForm(p => ({ ...p, description: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Severity</Label>
                        <Select value={alertForm.severity} onValueChange={v => setAlertForm(p => ({ ...p, severity: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={alertForm.alert_type} onValueChange={v => setAlertForm(p => ({ ...p, alert_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="access">Access</SelectItem>
                            <SelectItem value="integration">Integration</SelectItem>
                            <SelectItem value="workflow">Workflow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleCreateAlert} className="w-full">Create Alert</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {securityAlerts.length === 0 ? (
                <Card className="bg-card border-border/50"><CardContent className="p-6 flex items-center gap-2 text-muted-foreground"><CheckCircle2 size={18} className="text-green-400" /> No security alerts</CardContent></Card>
              ) : securityAlerts.map((a: any) => (
                <Card key={a.id} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {a.resolved ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-destructive" />}
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.description || "—"}{a.system_name ? ` · ${a.system_name}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-xs ${sevClass(a.severity)}`}>{a.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, h:mm a")}</span>
                        {!a.resolved && <Button size="sm" variant="outline" onClick={() => resolveAlert(a.id, a.title)}>Resolve</Button>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Anomalies */}
          <TabsContent value="anomalies" className="mt-4">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Eye size={18} /> Access Anomalies</CardTitle></CardHeader>
              <CardContent>
                {anomalies.length === 0 ? (
                  <p className="text-muted-foreground text-sm flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400" /> No anomalies detected</p>
                ) : (
                  <div className="space-y-2">
                    {anomalies.map((a: any) => (
                      <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{a.anomaly_type.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">{a.user_name || "Unknown"} — {a.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`text-xs ${sevClass(a.severity)}`}>{a.severity}</Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, h:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks */}
          <TabsContent value="risks" className="mt-4">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle size={18} /> System Risk Indicators</CardTitle></CardHeader>
              <CardContent>
                {risks.length === 0 ? (
                  <p className="text-muted-foreground text-sm flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400" /> No active risk indicators</p>
                ) : (
                  <div className="space-y-2">
                    {risks.map((r: any) => (
                      <div key={r.id} className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{r.system_name || "—"}</p>
                            <p className="text-sm text-muted-foreground">{r.risk_description}</p>
                          </div>
                          <Badge variant="secondary" className={`text-xs ${sevClass(r.severity)}`}>{r.severity}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance */}
          <TabsContent value="compliance" className="space-y-6 mt-4">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg">Compliance Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceItems.map((c: any) => (
                    <div key={c.id} className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{c.area}</p>
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Last reviewed: {c.last_review_date ? format(new Date(c.last_review_date), "MMM d, yyyy") : "Never"}</p>
                        </div>
                        <Select value={c.status} onValueChange={v => updateComplianceStatus(c.id, v, c.area)}>
                          <SelectTrigger className={`w-40 h-8 text-xs ${complianceStatusClass(c.status)}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_reviewed">Not Reviewed</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="compliant">Compliant</SelectItem>
                            <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><FileText size={18} /> Compliance Documents</CardTitle>
                  <Dialog open={docDialog} onOpenChange={setDocDialog}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Upload size={14} className="mr-1" /> Upload</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Upload Compliance Document</DialogTitle></DialogHeader>
                      <Input type="file" onChange={handleDocUpload} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {complianceDocs.length === 0 ? <p className="text-muted-foreground text-sm">No compliance documents.</p> : (
                  <div className="space-y-2">
                    {complianceDocs.map((d: any) => (
                      <div key={d.id} className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.category} · {d.file_size ? `${(d.file_size / 1024).toFixed(0)} KB` : "—"}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events */}
          <TabsContent value="events" className="space-y-4 mt-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search security events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>System</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No security events.</TableCell></TableRow>
                    ) : filteredEvents.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), "MMM d, h:mm a")}</TableCell>
                        <TableCell className="font-medium text-sm">{e.user_name || "System"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.event_type.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{e.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.affected_system || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <ControlledExternalActionGatesPanel />
        <GlobalAutonomyControlPanel />
      </div>
    </FounderLayout>
  );
};

export default SecurityDashboard;
