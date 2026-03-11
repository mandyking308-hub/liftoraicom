import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { ArrowLeft, BookOpenCheck, Save, FileText } from "lucide-react";

const ManualPageDetail = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    purpose: "", core_functions: "", user_roles: "", connected_modules: "",
    data_inputs: "", data_outputs: "", operational_notes: "", content: "",
  });

  const { data: page } = useQuery({
    queryKey: ["manual-page", id],
    queryFn: async () => {
      const { data } = await supabase.from("manual_pages").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  // Related knowledge entries
  const { data: knowledgeEntries = [] } = useQuery({
    queryKey: ["knowledge-for-manual", page?.module_name],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_entries").select("id, title, category")
        .or(`title.ilike.%${page!.module_name}%,description.ilike.%${page!.module_name}%`)
        .limit(5);
      return data ?? [];
    },
    enabled: !!page?.module_name,
  });

  useEffect(() => {
    if (page) {
      setForm({
        purpose: page.purpose || "",
        core_functions: page.core_functions || "",
        user_roles: page.user_roles || "",
        connected_modules: page.connected_modules || "",
        data_inputs: page.data_inputs || "",
        data_outputs: page.data_outputs || "",
        operational_notes: page.operational_notes || "",
        content: page.content || "",
      });
    }
  }, [page]);

  const handleSave = async () => {
    const { error } = await supabase.from("manual_pages").update({
      ...form,
      version: (page?.version || 1) + 1,
    }).eq("id", id!);
    if (error) { toast.error(error.message); return; }

    // Auto-create version entry
    await supabase.from("manual_versions").insert({
      version_number: (page?.version || 1) + 1,
      summary: `Updated ${page?.module_name} documentation`,
    });

    // Auto-create build log entry
    await supabase.from("build_log_entries").insert({
      title: `Documentation Updated: ${page?.module_name}`,
      description: `Manual page for ${page?.module_name} updated to version ${(page?.version || 1) + 1}`,
      module_affected: page?.module_name || "",
      change_type: "module_updated",
    });

    toast.success("Documentation saved");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["manual-page", id] });
    qc.invalidateQueries({ queryKey: ["manual-versions"] });
  };

  if (!page) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  const fields: { key: keyof typeof form; label: string; multiline?: boolean }[] = [
    { key: "purpose", label: "Purpose", multiline: true },
    { key: "core_functions", label: "Core Functions", multiline: true },
    { key: "user_roles", label: "User Roles" },
    { key: "connected_modules", label: "Connected Modules" },
    { key: "data_inputs", label: "Data Inputs" },
    { key: "data_outputs", label: "Data Outputs" },
    { key: "operational_notes", label: "Operational Notes", multiline: true },
    { key: "content", label: "Additional Content", multiline: true },
  ];

  return (
    <FounderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/founder/manual">
            <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpenCheck size={24} className="text-primary" /> {page.module_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {page.section} · Version {page.version} · Updated {format(new Date(page.updated_at), "MMM d, yyyy")}
            </p>
          </div>
          {editing ? (
            <Button onClick={handleSave}><Save size={16} className="mr-2" /> Save</Button>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          )}
        </div>

        {/* Documentation Fields */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Module Documentation</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {fields.map((f) => (
              <div key={f.key}>
                <Label className="text-sm font-medium">{f.label}</Label>
                {editing ? (
                  f.multiline ? (
                    <Textarea
                      value={form[f.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="mt-1"
                      rows={4}
                    />
                  ) : (
                    <Input
                      value={form[f.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="mt-1"
                    />
                  )
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {(page as any)[f.key] || "—"}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Linked Knowledge Entries */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Related Knowledge Base Entries</CardTitle></CardHeader>
          <CardContent>
            {knowledgeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related knowledge entries found.</p>
            ) : (
              <div className="space-y-2">
                {knowledgeEntries.map((k: any) => (
                  <Link
                    key={k.id}
                    to={`/founder/knowledge/${k.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <FileText size={14} className="text-primary" />
                    <div>
                      <p className="text-sm font-medium">{k.title}</p>
                      <p className="text-xs text-muted-foreground">{k.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default ManualPageDetail;
