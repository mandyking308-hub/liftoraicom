import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportLayout } from "./_shared";
import { Upload as UploadIcon, FileText, Database } from "lucide-react";

export default function ImportUpload() {
  return (
    <ImportLayout title="Upload" subtitle="Register a new import batch. All imports default to test mode and require founder approval before applying to live records.">
      <Card className="tech-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><UploadIcon size={14} className="text-primary" /> New import batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-muted-foreground">Supported formats: CSV, XLSX, JSON, or manual paste. Maximum 10,000 rows per batch in preview.</p>
          <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
            <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop a file or click to browse</p>
            <p className="text-[11px] text-muted-foreground mt-1">CSV · XLSX · JSON · up to 25MB</p>
            <p className="text-[11px] text-yellow-300 mt-3">Upload flow stages files in private storage; no real records are written until preview + approval.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            <div className="border border-border/50 rounded p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Import type</p>
              <p className="font-medium">Contacts · Customers · Sellers · Products · Invoices · Documents · Contracts · Vendors · Notes</p>
            </div>
            <div className="border border-border/50 rounded p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Target business</p>
              <p className="font-medium">Required for non-global imports</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST mode default</Badge>
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">Founder approval to apply</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database size={14} className="text-primary" /> Import Agent</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Suggests field mappings based on column headers + sample values.</p>
          <p>• Detects duplicates against Identity Resolution registry.</p>
          <p>• Flags missing required data and validation errors.</p>
          <p>• Recommends safe import mode (test first, batched apply, partial apply).</p>
          <p>• Prepares rollback plan covering created/updated record IDs.</p>
        </CardContent>
      </Card>
    </ImportLayout>
  );
}