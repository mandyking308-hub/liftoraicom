import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GIAS_FACT_LABEL, safeWebsite, searchGias, type GiasSearchParams } from "@/lib/gias/giasSearch";

const PAGE_SIZE = 25;

export default function GiasSearch() {
  const [draft, setDraft] = useState<GiasSearchParams>({});
  const [params, setParams] = useState<GiasSearchParams>({ page: 1, pageSize: PAGE_SIZE });
  const { data, isLoading, error } = useQuery({
    queryKey: ["gias-search", params],
    queryFn: () => searchGias(params),
  });
  const total = data?.total ?? 0;
  const page = params.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const field = (k: keyof GiasSearchParams, label: string) => (
    <Input placeholder={label} value={(draft[k] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
  );

  return (
    <FounderLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">School register search (GIAS)</h1>
          <p className="text-sm text-muted-foreground">
            Founder/admin only. Institutional records only — no contacts or people. Every fact is labelled “{GIAS_FACT_LABEL}”. Not linked to CRM or outreach.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
            <CardDescription>Name, town, postcode or URN, with optional filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-6"
              onSubmit={(e) => { e.preventDefault(); setParams({ ...draft, page: 1, pageSize: PAGE_SIZE }); }}
            >
              <div className="md:col-span-2">{field("q", "Name, town, postcode or URN")}</div>
              {field("status", "Status (e.g. Open)")}
              {field("phase", "Phase")}
              {field("county", "County")}
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {error && <p className="text-sm text-destructive">Search unavailable: {(error as Error).message}</p>}
            {!isLoading && !error && total === 0 && (
              <p className="text-sm text-muted-foreground">
                No records found. If this is unexpected, the GIAS rows may not have been imported yet — the register only shows what a confirmed import has loaded.
              </p>
            )}
            {total > 0 && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">{total.toLocaleString()} matching records</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URN</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead>
                      <TableHead>Type / phase</TableHead><TableHead>Town</TableHead><TableHead>Postcode</TableHead><TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.rows.map((r) => {
                      const site = safeWebsite(r.website);
                      return (
                        <TableRow key={r.urn}>
                          <TableCell className="font-mono">{r.urn}</TableCell>
                          <TableCell>{site ? <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">{r.establishment_name}</a> : r.establishment_name}</TableCell>
                          <TableCell>{r.establishment_status}</TableCell>
                          <TableCell>{[r.establishment_type, r.phase].filter(Boolean).join(" · ")}</TableCell>
                          <TableCell>{r.town}{r.county ? `, ${r.county}` : ""}</TableCell>
                          <TableCell>{r.postcode}</TableCell>
                          <TableCell><Badge variant="outline">{GIAS_FACT_LABEL}{r.source_snapshot_date ? ` · ${r.source_snapshot_date}` : ""}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 flex items-center justify-between">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setParams({ ...params, page: page - 1 })}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                  <Button variant="outline" disabled={page >= pages} onClick={() => setParams({ ...params, page: page + 1 })}>Next</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}
