import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Shield, AlertTriangle, Scale } from "lucide-react";

interface LegalCardProps {
  title: string;
  to: string;
}

const LegalCard = ({ title, to }: LegalCardProps) => (
  <Link to={to} className="block">
    <Card className="hover:border-primary/30 transition-colors cursor-pointer">
      <CardContent className="p-5 flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">Document coming soon.</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const agreements = [
  { title: "Terms of Service", to: "/legal/terms-of-service" },
  { title: "Enterprise Services Agreement", to: "/legal/enterprise-services-agreement" },
];

const policies = [
  { title: "Privacy Policy", to: "/legal/privacy-policy" },
  { title: "Acceptable Use Policy", to: "/legal/acceptable-use" },
  { title: "AI Usage Policy", to: "/legal/ai-usage-policy" },
  { title: "Automation Safety Policy", to: "/legal/automation-safety-policy" },
  { title: "Security Policy", to: "/legal/security-policy" },
  { title: "Cookie Policy", to: "/legal/cookie-policy" },
];

const compliance = [
  { title: "Data Processing Agreement", to: "/legal/data-processing-agreement" },
];

const disclaimers = [
  { title: "AI Output Disclaimer", to: "/legal/ai-output-disclaimer" },
  { title: "Automation Liability Disclaimer", to: "/legal/automation-liability-disclaimer" },
];

const LegalHub = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    <main className="flex-1 pt-16 pb-20">
      <div className="mx-auto max-w-[900px] px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Liftor Legal &amp; Policies
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          This page contains the legal agreements, policies, and compliance documentation governing the Liftor AI platform.
        </p>

        <div className="mt-10 space-y-12">
          {/* Agreements */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Agreements</h2>
            </div>
            <div className="space-y-4">
              {agreements.map((a) => <LegalCard key={a.to} {...a} />)}
            </div>
          </section>

          {/* Platform Policies */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Platform Policies</h2>
            </div>
            <div className="space-y-4">
              {policies.map((p) => <LegalCard key={p.to} {...p} />)}
            </div>
          </section>

          {/* Compliance & Data Protection */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Compliance &amp; Data Protection</h2>
            </div>
            <div className="space-y-4">
              {compliance.map((c) => <LegalCard key={c.to} {...c} />)}
            </div>
          </section>

          {/* Platform Disclaimers */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Platform Disclaimers</h2>
            </div>
            <div className="space-y-4">
              {disclaimers.map((d) => <LegalCard key={d.to} {...d} />)}
            </div>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default LegalHub;
