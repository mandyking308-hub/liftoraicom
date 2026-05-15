import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Shield } from "lucide-react";
import { format } from "date-fns";
import GlobalJurisdictionPolicyPanel from "@/components/founder/compliance/GlobalJurisdictionPolicyPanel";

const FounderLegalConsole = () => {
  const { data: docVersions = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["legal-document-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_document_versions" as any)
        .select("*")
        .order("document_name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: acceptances = [], isLoading: loadingAcceptances } = useQuery({
    queryKey: ["user-legal-acceptances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_legal_acceptance" as any)
        .select("*")
        .order("accepted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Legal Compliance</h1>
          <p className="text-muted-foreground mt-1">Policy versions and user acceptance records</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{docVersions.length}</p>
                <p className="text-sm text-muted-foreground">Legal Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{acceptances.length}</p>
                <p className="text-sm text-muted-foreground">Acceptance Records</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">v1.0</p>
                <p className="text-sm text-muted-foreground">Current Policy Version</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Legal Documents</TabsTrigger>
            <TabsTrigger value="acceptances">User Acceptances</TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Versions</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDocs ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docVersions.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.document_name}</TableCell>
                          <TableCell><Badge variant="outline">{doc.version}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(doc.published_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{doc.change_summary}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acceptances">
            <Card>
              <CardHeader>
                <CardTitle>User Legal Acceptances</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAcceptances ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : acceptances.length === 0 ? (
                  <p className="text-muted-foreground">No acceptance records yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Terms Version</TableHead>
                        <TableHead>Privacy Version</TableHead>
                        <TableHead>Accepted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acceptances.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{a.user_id?.slice(0, 8)}...</TableCell>
                          <TableCell><Badge variant="outline">{a.terms_version}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{a.privacy_version}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(a.accepted_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <GlobalJurisdictionPolicyPanel />
      </div>
    </FounderLayout>
  );
};

export default FounderLegalConsole;
