import PartnerLayout from "@/components/partner/PartnerLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { format } from "date-fns";

const PartnerDocuments = () => {
  const { user } = useAuth();

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["partner-all-documents", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data: opps } = await supabase
        .from("partner_opportunities")
        .select("id, company_name")
        .eq("partner_id", profileId!);
      if (!opps?.length) return [];
      const oppIds = opps.map((o) => o.id);
      const oppMap = Object.fromEntries(opps.map((o) => [o.id, o.company_name]));
      const { data } = await supabase
        .from("partner_documents")
        .select("*")
        .in("opportunity_id", oppIds)
        .order("created_at", { ascending: false });
      return (data ?? []).map((d) => ({ ...d, company_name: oppMap[d.opportunity_id] || "Unknown" }));
    },
  });

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">All documents across your opportunities</p>
        </div>

        {documents.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No documents available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <Card key={doc.id} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.company_name} · {format(new Date(doc.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{doc.uploaded_by}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
};

export default PartnerDocuments;
