import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  SLIM_MANDY_MANUAL_MARKDOWN,
  SLIM_MANDY_MANUAL_FILENAME,
  SLIM_MANDY_MANUAL_VERSION,
} from "@/lib/slimMandyManualContent";
import { Download, FileText, Lock, Layers } from "lucide-react";
import { toast } from "sonner";

type Layer = {
  id: string;
  layer_key: string;
  layer_name: string;
  purpose: string;
  retrieval_priority: number;
  is_portable: boolean;
  current_version: string | null;
};

type Draft = {
  id: string;
  layer_key: string;
  title: string;
  status: string;
  change_type: string;
  requires_founder_review: boolean;
  created_at: string;
};

export default function ManualsHub() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [acceptance, setAcceptance] = useState<any>(null);

  const load = async () => {
    const [{ data: l }, { data: d }] = await Promise.all([
      supabase
        .from("manual_source_layers")
        .select("*")
        .order("retrieval_priority"),
      supabase
        .from("manual_update_drafts")
        .select("id, layer_key, title, status, change_type, requires_founder_review, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setLayers((l as Layer[]) ?? []);
    setDrafts((d as Draft[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const runAcceptance = async () => {
    const { data, error } = await supabase.functions.invoke(
      "manual-source-hierarchy-acceptance",
      { body: {} },
    );
    if (error) {
      toast.error(`Acceptance failed: ${error.message}`);
      return;
    }
    setAcceptance(data);
    toast.success(`Manual hierarchy: ${data?.status ?? "unknown"}`);
  };

  const downloadSlim = () => {
    const blob = new Blob([SLIM_MANDY_MANUAL_MARKDOWN], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = SLIM_MANDY_MANUAL_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Slim Mandy Manual downloaded");
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" />
              Manuals Hub
            </h1>
            <p className="text-muted-foreground">
              Three-layer manual hierarchy with self-updating drafts and founder review.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> External LOCKED_BY_DESIGN
          </Badge>
        </div>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Slim Mandy Manual (portable)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Short portable summary — safe to upload to ChatGPT or share with advisers.
              Not the technical source of truth. Version: {SLIM_MANDY_MANUAL_VERSION}.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={downloadSlim}>
                <Download className="h-4 w-4 mr-2" /> Download markdown
              </Button>
              <Button size="sm" variant="outline" onClick={runAcceptance}>
                Run hierarchy acceptance
              </Button>
            </div>
            {acceptance && (
              <pre className="text-xs bg-muted/20 p-3 rounded-md border border-border/60 overflow-x-auto">
                {JSON.stringify(acceptance, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Source layer hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {layers.map((l) => (
                <div
                  key={l.id}
                  className="p-3 border border-border/60 rounded-md text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{l.retrieval_priority}</Badge>
                      <span className="font-medium">{l.layer_name}</span>
                      {l.is_portable && (
                        <Badge variant="outline" className="text-xs">portable</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      v{l.current_version ?? "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{l.purpose}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Button variant="outline" size="sm" asChild>
                <Link to="/founder/user-manual">Open User Manual</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/founder/founder-manual">Open Full Technical Manual</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/founder/build-log">Open Build Log</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/founder/build-phase-closeout">Open Closeout</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Manual update drafts (versioned, founder review)</CardTitle>
          </CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No drafts yet. Build changes create drafts here for founder review
                before merge. No manual is silently overwritten.
              </p>
            ) : (
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 border border-border/60 rounded-md text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{d.title}</span>
                      <Badge
                        variant={
                          d.status === "approved" || d.status === "merged"
                            ? "default"
                            : d.status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {d.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {d.layer_key} · {d.change_type} ·{" "}
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}