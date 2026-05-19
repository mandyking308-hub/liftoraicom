import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function BrainProvider() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("liftor-brain-provider-check", { body: {} });
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => { check(); }, []);

  return (
    <FounderLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Liftor Brain — Provider</h1>
          <Link to="/founder/brain"><Button variant="outline" size="sm">Back to Brain</Button></Link>
        </div>
        <Card className="tech-card">
          <CardHeader>
            <CardTitle>OpenAI provider readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Button onClick={check} disabled={loading} size="sm">{loading ? "Checking…" : "Re-check provider"}</Button>
            {status ? (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">key: {status.provider_key}</Badge>
                  <Badge variant={status.secret_present ? "secondary" : "destructive"}>
                    secret {status.secret_present ? "present" : "missing"}
                  </Badge>
                  <Badge variant="outline">status: {status.provider_status}</Badge>
                  <Badge variant="outline">can_call_ai: {String(status.can_call_ai)}</Badge>
                  <Badge variant="outline">secret_value_returned: false</Badge>
                  <Badge variant="outline">secret_value_stored: false</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Secret name: <code>{status.secret_name}</code> · Default model: {status.default_model}
                </p>
                <p className="text-xs">{status.next_action}</p>
              </div>
            ) : <p className="text-xs text-muted-foreground">No status yet.</p>}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}