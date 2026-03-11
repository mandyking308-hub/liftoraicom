import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

interface Project { id: string; name: string; }
interface SupportRequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  request_type: string;
  status: string;
  created_at: string;
  project_id: string;
}

const Support = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [requestType, setRequestType] = useState("issue");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [projRes, reqRes] = await Promise.all([
      supabase.from("projects").select("id, name"),
      supabase.from("support_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (projRes.data) {
      setProjects(projRes.data);
      if (projRes.data.length > 0 && !projectId) setProjectId(projRes.data[0].id);
    }
    if (reqRes.data) setRequests(reqRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("support_requests").insert({
      project_id: projectId,
      user_id: user.id,
      title,
      description,
      priority,
      request_type: requestType,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit request.");
    } else {
      toast.success("Support request submitted.");
      setTitle("");
      setDescription("");
      setShowForm(false);
      loadData();
    }
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "text-red-400";
    if (p === "medium") return "text-yellow-400";
    return "text-muted-foreground";
  };

  const statusIcon = (s: string) => {
    if (s === "resolved") return <CheckCircle2 size={14} className="text-primary" />;
    if (s === "in_progress") return <Clock size={14} className="text-yellow-400" />;
    return <AlertCircle size={14} className="text-muted-foreground" />;
  };

  return (
    <PortalLayout>
      <div className="max-w-4xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Support</h1>
            <p className="text-muted-foreground mt-1">Submit and track support requests</p>
          </div>
          {projects.length > 0 && (
            <Button variant="glow" size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} /> New Request
            </Button>
          )}
        </div>

        {showForm && (
          <div className="p-6 rounded-xl border border-border/50 bg-card mb-8">
            <h2 className="text-lg font-semibold mb-4">New Support Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Project</label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Type</label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="clarification">Clarification Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description" className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description..." className="bg-secondary border-border min-h-[100px]" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" variant="glow" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button type="button" variant="outline-light" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">
            No support requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="p-5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(r.status)}
                    <h3 className="font-semibold text-sm">{r.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`capitalize ${priorityColor(r.priority)}`}>{r.priority}</span>
                    <span className="text-muted-foreground capitalize">{r.request_type.replace("_", " ")}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default Support;
