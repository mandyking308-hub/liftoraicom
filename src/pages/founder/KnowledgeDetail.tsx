import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { ArrowLeft, BookOpen, FileText, Upload, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["System Architecture", "Automation Patterns", "AI Agent Design", "Workflow Optimisation", "Deployment Lessons", "General"];
const ENTRY_TYPES = [
  { value: "knowledge", label: "Knowledge Entry" },
  { value: "workflow_template", label: "Workflow Template" },
  { value: "agent_pattern", label: "Agent Design Pattern" },
  { value: "lesson", label: "Lesson Learned" },
];

const KnowledgeDetail = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: entry, isLoading } = useQuery({
    queryKey: ["knowledge-entry", id],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_entries").select("*").eq("id", id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["knowledge-docs", id],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_documents").select("*").eq("knowledge_entry_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const updateEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("knowledge_entries").update({
        title: form.title,
        category: form.category,
        description: form.description,
        content: form.content,
        entry_type: form.entry_type,
        related_system_name: form.related_system_name,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-entry", id] });
      setEditing(false);
      toast.success("Entry updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("knowledge-documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("knowledge_documents").insert({
        knowledge_entry_id: id!,
        name: file.name,
        file_path: path,
        file_size: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-docs", id] });
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Upload failed"),
  });

  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("knowledge-documents").remove([doc.file_path]);
      await supabase.from("knowledge_documents").delete().eq("id", doc.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-docs", id] });
      toast.success("Document removed");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDoc.mutate(file);
    e.target.value = "";
  };

  const startEdit = () => {
    setForm({ ...entry });
    setEditing(true);
  };

  if (isLoading) return <FounderLayout><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div></FounderLayout>;
  if (!entry) return <FounderLayout><p className="text-muted-foreground">Entry not found.</p></FounderLayout>;

  const typeClass = (t: string) => {
    if (t === "workflow_template") return "bg-primary/20 text-primary";
    if (t === "agent_pattern") return "bg-green-500/20 text-green-400";
    if (t === "lesson") return "bg-yellow-500/20 text-yellow-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/founder/knowledge"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold">{entry.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${typeClass(entry.entry_type)}`}>{entry.entry_type.replace(/_/g, " ")}</Badge>
                <span className="text-xs text-muted-foreground">{entry.category}</span>
                {entry.related_system_name && <span className="text-xs text-muted-foreground">· {entry.related_system_name}</span>}
              </div>
            </div>
          </div>
          {!editing && <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>}
        </div>

        {editing && form ? (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Edit Entry</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Title" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.category} onValueChange={v => setForm((f: any) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.entry_type} onValueChange={v => setForm((f: any) => ({ ...f, entry_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Related System" value={form.related_system_name || ""} onChange={e => setForm((f: any) => ({ ...f, related_system_name: e.target.value }))} />
              <Textarea placeholder="Description" value={form.description || ""} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3} />
              <Textarea placeholder="Content / Details" value={form.content || ""} onChange={e => setForm((f: any) => ({ ...f, content: e.target.value }))} rows={8} />
              <div className="flex gap-2">
                <Button onClick={() => updateEntry.mutate()} disabled={updateEntry.isPending}><Save size={16} className="mr-2" /> Save</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Description */}
            {entry.description && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{entry.description}</p></CardContent>
              </Card>
            )}

            {/* Content */}
            {entry.content && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BookOpen size={18} /> Content</CardTitle></CardHeader>
                <CardContent><div className="text-sm whitespace-pre-wrap bg-secondary/50 rounded-lg p-4">{entry.content}</div></CardContent>
              </Card>
            )}
          </>
        )}

        {/* Documents */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><FileText size={18} /> Documents</CardTitle>
              <label>
                <input type="file" className="hidden" onChange={handleFileChange} />
                <Button size="sm" variant="outline" asChild><span><Upload size={14} className="mr-2" /> Upload</span></Button>
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No documents attached.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-primary" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : "—"} · {format(new Date(doc.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteDoc.mutate(doc)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Created</p><p className="font-medium">{format(new Date(entry.created_at), "MMM d, yyyy")}</p></div>
              <div><p className="text-muted-foreground text-xs">Updated</p><p className="font-medium">{format(new Date(entry.updated_at), "MMM d, yyyy")}</p></div>
              <div><p className="text-muted-foreground text-xs">Category</p><p className="font-medium">{entry.category}</p></div>
              <div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium capitalize">{entry.entry_type.replace(/_/g, " ")}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default KnowledgeDetail;
