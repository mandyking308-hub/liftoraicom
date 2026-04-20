import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import SupplierLayout from "@/components/supplier/SupplierLayout";
import SupplierRoute, { SupplierSession } from "@/components/supplier/SupplierRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { supplierToken } from "@/pages/supplier/SupplierLogin";

type Row = {
  id: string; deal_name: string | null; business_name: string;
  status: "assigned" | "in_progress" | "completed" | "failed";
  assigned_at: string;
};

const Inner = ({ session }: { session: SupplierSession }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("supplier_list_assignments", { _token: supplierToken.get() });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const counts = {
    active: rows.filter((r) => r.status === "in_progress" || r.status === "assigned").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    completed: rows.filter((r) => r.status === "completed").length,
  };
  const upcoming = rows.filter((r) => r.status === "assigned" || r.status === "in_progress").slice(0, 5);

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {session.supplier_name || session.supplier_email}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {session.business_name || "Global supplier"} · {session.role || "—"}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={Briefcase} label="Active assignments" value={counts.active} />
          <StatCard icon={Clock} label="In progress" value={counts.in_progress} />
          <StatCard icon={CheckCircle2} label="Completed" value={counts.completed} />
        </div>

        <Card className="tech-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Upcoming work</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/supplier/assignments">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nothing in your queue. You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {upcoming.map((r) => (
                  <li key={r.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-medium">{r.deal_name || "Untitled engagement"}</p>
                      <p className="text-xs text-muted-foreground">{r.business_name || "—"} · assigned {new Date(r.assigned_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </SupplierLayout>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: number }) => (
  <Card className="tech-card">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const SupplierDashboard = () => <SupplierRoute>{(s) => <Inner session={s} />}</SupplierRoute>;
export default SupplierDashboard;