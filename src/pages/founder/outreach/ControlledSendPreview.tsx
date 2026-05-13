import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_IDS = [
  "8a92edbb-2e61-49b7-a6df-3bac21268fe0",
  "677a3ffd-bf48-457d-88e1-189225d8ce6a",
  "e5a80b74-48b2-4317-89e5-bc687e42cb65",
].join("\n");

export default function ControlledSendPreview() {
  const [input, setInput] = useState(DEFAULT_IDS);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setResult(null);
    const ids = input.split(/\s+/).map(s => s.trim()).filter(Boolean);
    const { data, error } = await supabase.functions.invoke("controlled-send-preview", {
      body: { queue_ids: ids },
    });
    setResult(error ? { error: error.message } : data);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Controlled Send Preview Gate</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Dry-run only. Inspect what <em>would</em> be sent without touching the queue, SMTP, Apollo or any provider.
          The Apply / Send path is intentionally not built in this turn — the auto-send kill switch must remain enforced.
        </p>
      </div>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle>Queue rows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={6} value={input} onChange={(e) => setInput(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={runPreview} disabled={loading}>
              {loading ? "Previewing…" : "Run dry-run preview"}
            </Button>
            <Button variant="outline" disabled title="Apply path intentionally not built">
              Apply / Send (disabled)
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preview result
              <Badge variant={result?.auto_send_enabled ? "destructive" : "secondary"}>
                auto_send_enabled = {String(result?.auto_send_enabled)}
              </Badge>
              <Badge variant="outline">sends_to_create = {result?.sends_to_create ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-[600px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}