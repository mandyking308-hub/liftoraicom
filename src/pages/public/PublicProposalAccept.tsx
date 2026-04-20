import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PublicProposalAccept() {
  const { token } = useParams();
  const [state, setState] = useState<"confirm" | "submitting" | "ok" | "error">("confirm");
  const [msg, setMsg] = useState("");

  const accept = async () => {
    setState("submitting");
    const { data, error } = await supabase.rpc("accept_proposal_by_token", { _token: token! });
    if (error || (data as any)?.ok === false) {
      setMsg(error?.message || (data as any)?.error || "Could not accept");
      setState("error"); return;
    }
    setState("ok");
  };

  useEffect(() => {}, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEOHead title="Accept Proposal — Liftor AI" description="Confirm and accept your Liftor AI engagement proposal." />
      <Card className="tech-card max-w-md w-full p-8 text-center">
        {state === "confirm" && (
          <>
            <h1 className="text-2xl font-bold mb-2">Accept proposal</h1>
            <p className="text-sm text-muted-foreground mb-6">Confirming creates the engagement and triggers invoice issuance.</p>
            <Button size="lg" onClick={accept} className="w-full"><CheckCircle2 size={16} className="mr-2" /> Confirm acceptance</Button>
          </>
        )}
        {state === "submitting" && (
          <div className="text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" /> Processing…</div>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
            <h1 className="text-xl font-bold mb-1">Proposal accepted</h1>
            <p className="text-sm text-muted-foreground mb-6">Our team will be in touch shortly.</p>
            <Button asChild variant="outline"><Link to="/">Back to Liftor</Link></Button>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle size={40} className="mx-auto text-destructive mb-3" />
            <h1 className="text-xl font-bold mb-1">Could not accept</h1>
            <p className="text-sm text-muted-foreground mb-6">{msg}</p>
            <Button asChild variant="outline"><Link to="/">Back to Liftor</Link></Button>
          </>
        )}
      </Card>
    </div>
  );
}