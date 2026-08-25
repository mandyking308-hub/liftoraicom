import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Layers, Lock, Download } from "lucide-react";
import {
  SLIM_MANDY_MANUAL_MARKDOWN,
  SLIM_MANDY_MANUAL_FILENAME,
} from "@/lib/slimMandyManualContent";

export default function ManualsHierarchyPanel() {
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
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Manuals — three-layer hierarchy
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Slim portable, plain-English user, and full technical — with versioned drafts and founder review.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> No overwrites
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Command Centre Truth Sync — live state</li>
          <li>Full Technical Manual — canonical architecture · {ARCHITECTURE_SYNC_VERSION}</li>
          <li>User Manual — operator guide · v{LIFTOR_USER_MANUAL_VERSION}</li>
          <li>Build Log — historical decisions</li>
          <li>Business Manuals — selected business scope</li>
          <li>Slim Mandy Manual — portable handover only · v{SLIM_MANDY_MANUAL_VERSION}</li>
        </ol>
        <p className="text-[11px] text-muted-foreground">
          Current-architecture map: Full Technical Manual, Section 100 — August 2026 Architecture Reconciliation.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to="/founder/manuals-hub">Open Manuals Hub</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={downloadSlim}>
            <Download className="h-4 w-4 mr-2" /> Slim Mandy Manual
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}