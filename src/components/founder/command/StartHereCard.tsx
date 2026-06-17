import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LINKS: { label: string; to: string }[] = [
  { label: "Start Here", to: "/founder/start-here" },
  { label: "Setup a Business", to: "/founder/start-here/setup-business" },
  { label: "Founder User Guide", to: "/founder/user-guide" },
  { label: "AI Co-Pilot", to: "/founder/copilot" },
];

export default function StartHereCard() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Start Here / First Run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            New morning? Begin with the guided 10-step start, then the setup wizard. Everything stays founder-only, draft, and not live.
          </p>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <Button key={l.to} asChild size="sm" variant="outline">
                <Link to={l.to}>{l.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}