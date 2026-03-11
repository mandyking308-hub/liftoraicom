import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { FileText, Download } from "lucide-react";

const FounderDocuments = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("project_documents")
      .select("*, projects(name)")
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

  return (
    <FounderLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">All project documents across the platform</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center">
            <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.projects as any)?.name || "Unknown Project"} · {doc.category} · {doc.uploaded_by} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDownload(doc.file_path, doc.name)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default FounderDocuments;
