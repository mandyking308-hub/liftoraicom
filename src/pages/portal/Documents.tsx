import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { FileText, Download } from "lucide-react";

interface Document {
  id: string;
  name: string;
  file_path: string;
  category: string;
  uploaded_by: string;
  created_at: string;
  project_id: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("project_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDocuments(data);
        setLoading(false);
      });
  }, []);

  const handleDownload = async (filePath: string, name: string) => {
    const { data } = await supabase.storage.from("project-documents").download(filePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const cat = doc.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <PortalLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">Project documentation and files</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center">
            <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No documents uploaded yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Documents will appear here as your project progresses.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, docs]) => (
              <div key={category}>
                <h2 className="text-sm font-medium text-primary tracking-widest uppercase mb-3">{category}</h2>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.uploaded_by} · {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc.file_path, doc.name)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default Documents;
