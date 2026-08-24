import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 100;
const TABLE_NAME = "billionaire_access_research_2026";
const SUMMARY_VIEW = "billionaire_access_research_2026_summary";
const EVIDENCE_BASE_URL = "https://github.com/mandyking308-hub/liftoraicom/blob/main/";

const VERIFICATION_STATUSES = [
  "verified_public_institutional",
  "verified_institutional_restricted",
  "verified_institutional_switchboard_or_postal",
  "verified_institutional_source_age_warning",
  "legal_compliance_block",
  "enhanced_compliance_review",
  "deceased_remove_from_active_outreach",
] as const;

const MATCH_STATUSES = [
  "matched",
  "unmatched_new_2026",
  "ambiguous",
  "manual_review",
  "missing_snapshot",
] as const;

type BillionaireAccessRow = {
  source_row: number;
  billionaire_name: string;
  institutional_route: string;
  access_mode: string | null;
  restriction_notes: string | null;
  verification_status: string;
  official_source: string | null;
  evidence_file: string;
  correction_notes: string | null;
  reviewed_at: string;
  outreach_allowed: boolean;
  match_status: string;
  match_confidence: number;
};

type BillionaireAccessSummary = {
  source_rows: number;
  snapshot_rows_linked: number;
  historical_ids_linked: number;
  matched: number;
  ambiguous: number;
  new_2026_names: number;
  manual_review: number;
  missing_snapshot: number;
  verified_public_institutional: number;
  verified_institutional_restricted: number;
  verified_institutional_source_age_warning: number;
  verified_institutional_switchboard_or_postal: number;
  legal_compliance_block: number;
  deceased_remove_from_active_outreach: number;
  enhanced_compliance_review: number;
  any_outreach_enabled: boolean;
};

const verificationLabels: Record<string, string> = {
  verified_public_institutional: "Public institutional",
  verified_institutional_restricted: "Restricted institutional",
  verified_institutional_switchboard_or_postal: "Switchboard / postal",
  verified_institutional_source_age_warning: "Source-age warning",
  legal_compliance_block: "Legal block",
  enhanced_compliance_review: "Enhanced review",
  deceased_remove_from_active_outreach: "Deceased — remove",
};

const matchLabels: Record<string, string> = {
  matched: "Historical record linked",
  unmatched_new_2026: "New in 2026",
  ambiguous: "Ambiguous",
  manual_review: "Manual review",
  missing_snapshot: "Missing snapshot",
  pending: "Pending",
};

const verificationVariant = (status: string) => {
  if (status === "legal_compliance_block" || status === "deceased_remove_from_active_outreach") {
    return "destructive" as const;
  }
  if (status === "verified_public_institutional") return "default" as const;
  if (status === "enhanced_compliance_review") return "secondary" as const;
  return "outline" as const;
};

const matchVariant = (status: string) => {
  if (status === "matched") return "default" as const;
  if (status === "ambiguous" || status === "manual_review" || status === "missing_snapshot") {
    return "destructive" as const;
  }
  return "outline" as const;
};

const safeExternalUrl = (value: string | null) =>
  value && /^https?:\/\//i.test(value) ? value : null;

const formatCount = (value: number | undefined, loading: boolean) =>
  loading || value === undefined ? "—" : value.toLocaleString();

const BillionaireAccessResearchPanel = () => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("ALL");
  const [matchStatus, setMatchStatus] = useState("ALL");

  // This protected table and view are deployed before generated client types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const summaryQuery = useQuery({
    queryKey: ["billionaire-access-2026-summary"],
    queryFn: async () => {
      const { data, error } = await db.from(SUMMARY_VIEW).select("*").single();
      if (error) throw error;
      return data as BillionaireAccessSummary;
    },
  });

  const recordsQuery = useQuery({
    queryKey: ["billionaire-access-2026", page, search, verificationStatus, matchStatus],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = db
        .from(TABLE_NAME)
        .select(
          "source_row,billionaire_name,institutional_route,access_mode,restriction_notes,verification_status,official_source,evidence_file,correction_notes,reviewed_at,outreach_allowed,match_status,match_confidence",
          { count: "exact" },
        )
        .order("source_row", { ascending: true })
        .range(from, to);

      const safeSearch = search.trim().replace(/[,%()]/g, " ");
      if (safeSearch) {
        query = query.or(
          "billionaire_name.ilike.%" +
            safeSearch +
            "%,institutional_route.ilike.%" +
            safeSearch +
            "%,access_mode.ilike.%" +
            safeSearch +
            "%",
        );
      }
      if (verificationStatus !== "ALL") {
        query = query.eq("verification_status", verificationStatus);
      }
      if (matchStatus !== "ALL") {
        query = query.eq("match_status", matchStatus);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data ?? []) as BillionaireAccessRow[],
        count: count ?? 0,
      };
    },
  });

  const summary = summaryQuery.data;
  const rows = recordsQuery.data?.rows ?? [];
  const total = recordsQuery.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);
  const reviewQueue =
    (summary?.ambiguous ?? 0) +
    (summary?.manual_review ?? 0) +
    (summary?.missing_snapshot ?? 0);

  const summaryCards = [
    { label: "Complete records", value: summary?.source_rows },
    { label: "Snapshot linked", value: summary?.snapshot_rows_linked },
    { label: "Historical IDs linked", value: summary?.historical_ids_linked },
    { label: "New 2026 names", value: summary?.new_2026_names },
    { label: "Public institutional", value: summary?.verified_public_institutional },
    { label: "Restricted institutional", value: summary?.verified_institutional_restricted },
    { label: "Review queue", value: summary ? reviewQueue : undefined },
    {
      label: "Outreach enabled",
      value: summary ? (summary.any_outreach_enabled ? 1 : 0) : undefined,
    },
  ];

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setVerificationStatus("ALL");
    setMatchStatus("ALL");
    setPage(1);
  };

  const refresh = async () => {
    await Promise.all([summaryQuery.refetch(), recordsQuery.refetch()]);
  };

  return (
    <Card className="tech-card border-primary/25">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">Billionaire Access — complete 2026 research</CardTitle>
            <p className="text-sm text-muted-foreground">
              Live Liftor production data: all 3,428 institutional routes, restrictions,
              evidence and reconciliation status. Records are shown 100 at a time.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={summaryQuery.isFetching || recordsQuery.isFetching}
          >
            <RefreshCw
              className={
                "mr-2 h-4 w-4 " +
                (summaryQuery.isFetching || recordsQuery.isFetching ? "animate-spin" : "")
              }
            />
            Refresh live data
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <div className="font-medium">Protected institutional intelligence</div>
              <div className="text-muted-foreground">
                Founder/admin access only. No private personal contact data. Outreach remains
                disabled for every record.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {summaryCards.map((item) => (
            <div key={item.label} className="rounded-lg border border-border/60 bg-card/50 p-3">
              <div className="text-lg font-semibold">
                {formatCount(item.value, summaryQuery.isLoading)}
              </div>
              <div className="text-[11px] leading-tight text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        {summaryQuery.error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            The reconciliation totals could not be loaded: {(summaryQuery.error as Error).message}
          </div>
        ) : null}

        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search billionaire, organisation or access route"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          <Select
            value={verificationStatus}
            onValueChange={(value) => {
              setVerificationStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[235px]">
              <SelectValue placeholder="All verification statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All verification statuses</SelectItem>
              {VERIFICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {verificationLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={matchStatus}
            onValueChange={(value) => {
              setMatchStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[210px]">
              <SelectValue placeholder="All match statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All match statuses</SelectItem>
              {MATCH_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {matchLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </form>

        {recordsQuery.error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            The live research records could not be loaded: {(recordsQuery.error as Error).message}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Row</TableHead>
                  <TableHead className="w-[180px]">Billionaire</TableHead>
                  <TableHead className="w-[330px]">Institutional route</TableHead>
                  <TableHead className="w-[300px]">Access & restrictions</TableHead>
                  <TableHead className="w-[190px]">Verification</TableHead>
                  <TableHead className="w-[175px]">Reconciliation</TableHead>
                  <TableHead className="w-[170px]">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading the live Liftor research table…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No records match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const officialUrl = safeExternalUrl(row.official_source);
                    const evidenceUrl = EVIDENCE_BASE_URL + row.evidence_file;
                    return (
                      <TableRow key={row.source_row} className="align-top">
                        <TableCell className="font-mono text-xs">{row.source_row}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.billionaire_name}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Reviewed {row.reviewed_at}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="whitespace-normal font-medium">
                            {row.institutional_route}
                          </div>
                          {officialUrl ? (
                            <a
                              href={officialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
                            >
                              Open official source
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          ) : row.official_source ? (
                            <div className="mt-2 break-all text-xs text-muted-foreground">
                              {row.official_source}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="whitespace-normal text-sm">
                            {row.access_mode || "No access mode recorded"}
                          </div>
                          {row.restriction_notes ? (
                            <details className="mt-2 text-xs text-muted-foreground">
                              <summary className="cursor-pointer font-medium text-foreground">
                                Restrictions
                              </summary>
                              <p className="mt-1 whitespace-normal">{row.restriction_notes}</p>
                            </details>
                          ) : null}
                          {row.correction_notes ? (
                            <details className="mt-2 text-xs text-muted-foreground">
                              <summary className="cursor-pointer font-medium text-foreground">
                                Research notes
                              </summary>
                              <p className="mt-1 whitespace-normal">{row.correction_notes}</p>
                            </details>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={verificationVariant(row.verification_status)}
                            className="whitespace-normal text-left"
                          >
                            {verificationLabels[row.verification_status] ?? row.verification_status}
                          </Badge>
                          <div className="mt-2 text-[11px] font-medium text-muted-foreground">
                            Outreach: {row.outreach_allowed ? "ENABLED" : "LOCKED"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={matchVariant(row.match_status)} className="whitespace-normal">
                            {matchLabels[row.match_status] ?? row.match_status}
                          </Badge>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            Confidence {row.match_confidence}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                          >
                            Open evidence
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                          <div className="mt-2 break-all text-[10px] text-muted-foreground">
                            {row.evidence_file}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing {firstRow.toLocaleString()}–{lastRow.toLocaleString()} of{" "}
            {total.toLocaleString()} matching records · 100 per page
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page <= 1 || recordsQuery.isFetching}
            >
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || recordsQuery.isFetching}
            >
              Previous 100
            </Button>
            <span className="min-w-[105px] text-center text-sm">
              Page {page} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page >= pageCount || recordsQuery.isFetching}
            >
              Next 100
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount || recordsQuery.isFetching}
            >
              Last
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillionaireAccessResearchPanel;
