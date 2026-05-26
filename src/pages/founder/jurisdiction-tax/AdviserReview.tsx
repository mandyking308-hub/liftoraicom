import { useEffect, useState } from "react";
import { JTLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { fetchAdviserReviewItems, REVIEW_TYPE_META, type AdviserReviewItem } from "@/lib/jurisdictionTaxEngine";

export default function JTAdviserReview() {
  const [rows, setRows] = useState<AdviserReviewItem[]>([]);
  useEffect(() => { fetchAdviserReviewItems().then(setRows); }, []);
  return (
    <JTLayout title="Adviser review queue" subtitle="Questions prepared for your tax/legal advisers. Nothing is sent externally without founder approval.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Questions ({rows.length})
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 ml-auto"><Lock size={9} className="mr-1" /> No adviser emails sent</Badge>
        </CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Type</th><th className="p-2">Priority</th><th className="p-2">Status</th><th className="p-2">Question</th><th className="p-2">Answer</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No adviser questions.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="p-2"><Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">{REVIEW_TYPE_META[r.review_type]}</Badge></td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.question}</td>
                  <td className="p-2 text-muted-foreground">{r.answer_summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </JTLayout>
  );
}