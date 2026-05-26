import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, DoorClosed } from "lucide-react";

export default function PortalPlaceholder({ title, subtitle, sections }: { title: string; subtitle: string; sections: { label: string; body: ReactNode }[] }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DoorClosed size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Not activated
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-4 text-xs">
            <p>This portal is not yet activated for your account. No data is exposed here. If you believe this is in error, contact your account owner.</p>
          </CardContent>
        </Card>
        {sections.map(s => (
          <Card key={s.label} className="tech-card opacity-70">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">{s.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
