import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

const SecurityReporting = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="Security reporting | Liftor AI" description="Responsible disclosure process for reporting security vulnerabilities to Liftor AI." />
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Security Reporting</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>Liftor is committed to maintaining the security and integrity of the platform.</p>
              <p>If you believe you have identified a security vulnerability affecting the Liftor platform, we encourage responsible disclosure so the issue can be investigated and resolved.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Responsible Disclosure</h2>
              <p className="text-foreground">Security researchers and users are encouraged to report potential vulnerabilities responsibly.</p>
              <p className="text-foreground">Please provide sufficient information to allow our team to reproduce and investigate the issue.</p>
              <p className="text-foreground">Examples of useful information include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>description of the vulnerability</li>
                <li>steps to reproduce the issue</li>
                <li>potential impact</li>
                <li>screenshots or logs if available</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Responsible Research Expectations</h2>
              <p className="text-foreground">When investigating potential vulnerabilities, researchers must:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>avoid actions that may harm platform users</li>
                <li>avoid accessing data belonging to other users</li>
                <li>avoid disrupting platform services</li>
                <li>act in good faith to support platform security</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Reporting Process</h2>
              <p className="text-foreground">If you identify a security vulnerability, please report it through Liftor's official support channels.</p>
              <p className="text-foreground">Include as much relevant information as possible so the issue can be reviewed.</p>
              <p className="text-foreground">Liftor will review submitted reports and take appropriate action where necessary.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Platform Security Commitment</h2>
              <p className="text-foreground">Liftor continuously monitors and improves platform security.</p>
              <p className="text-foreground">Reports submitted through responsible disclosure channels help maintain a secure environment for all users.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/security-policy" className="text-primary hover:underline">Security Policy</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SecurityReporting;
