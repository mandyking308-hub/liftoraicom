import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOKEN_KEY = "liftor.supplier_token";

export const supplierToken = {
  get: () => localStorage.getItem(TOKEN_KEY) || "",
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const SupplierLogin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = params.get("token");
    if (t) {
      // Strip token from URL immediately so it doesn't persist in browser
      // history, server logs, or Referer headers.
      window.history.replaceState({}, "", "/supplier/login");
      setToken(t);
      void attempt(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attempt(t: string) {
    if (!t.trim()) {
      toast.error("Enter your access token");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("supplier_login_with_token", { _token: t.trim() });
    setBusy(false);
    const result = data as { ok: boolean; error?: string; supplier_name?: string } | null;
    if (error || !result?.ok) {
      toast.error(result?.error?.replace(/_/g, " ").toLowerCase() || error?.message || "Login failed");
      return;
    }
    supplierToken.set(t.trim());
    toast.success(`Welcome, ${result.supplier_name || "supplier"}`);
    navigate("/supplier/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md tech-card">
        <CardHeader className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Supplier Portal</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in with the access link or token sent to your email.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Access token</Label>
            <Input
              id="token"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token"
              onKeyDown={(e) => e.key === "Enter" && attempt(token)}
            />
          </div>
          <Button className="w-full" onClick={() => attempt(token)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sign in
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Don't have a token? Contact your Liftor account manager.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierLogin;