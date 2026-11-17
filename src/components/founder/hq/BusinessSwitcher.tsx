import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BusinessSwitcher({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data = [] } = useQuery({
    queryKey: ["hq_active_businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id, name").eq("portfolio_status", "active").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  return (
    <Select value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <SelectTrigger className="w-64" aria-label="Business"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All businesses</SelectItem>
        {data.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
