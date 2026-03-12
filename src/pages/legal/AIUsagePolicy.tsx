import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const AIUsagePolicy = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor AI Usage Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>This AI Usage Policy governs how artificial intelligence systems available through the Liftor platform may be used.</p>
              <p>Liftor provides infrastructure for organisations to deploy AI agents, automation workflows, and decision-support systems.</p>
              <p>Users must ensure that AI systems created or operated through Liftor comply with this policy and all applicable laws.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Responsible Use of Artificial Intelligence</h2>
              <p className="text-foreground">Users must ensure that AI systems deployed through Liftor are used responsibly and ethically.</p>
              <p className="text-foreground">AI systems must not be designed or deployed in ways that cause harm, violate laws, or infringe the rights of others.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Prohibited AI Applications</h2>
              <p className="text-foreground">AI systems created or operated through Liftor may not be used to:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>conduct unlawful activities</li>
                <li>create systems designed to deceive individuals or organisations</li>
                <li>generate harmful or abusive content</li>
                <li>impersonate individuals without authorisation</li>
                <li>conduct harassment or intimidation</li>
                <li>automate fraudulent activities</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. AI Decision Systems</h2>
              <p className="text-foreground">Users must not rely solely on automated AI outputs when making decisions that could significantly affect individuals.</p>
              <p className="text-foreground">Where AI outputs may influence important outcomes, appropriate human review must be implemented.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Data Responsibility</h2>
              <p className="text-foreground">Users remain responsible for ensuring that any data submitted to AI systems through Liftor:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>has been lawfully obtained</li>
                <li>may legally be processed by automation systems</li>
                <li>does not violate privacy or confidentiality obligations</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Transparency</h2>
              <p className="text-foreground">Users should ensure that AI-generated outputs are not misrepresented as human-generated where doing so would mislead others.</p>
              <p className="text-foreground">Organisations deploying AI agents through Liftor should provide appropriate disclosure where required.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. High-Risk Applications</h2>
              <p className="text-foreground">AI systems deployed through Liftor must not be used in applications that could cause significant harm if they fail or behave unpredictably.</p>
              <p className="text-foreground">Examples may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>medical decision systems</li>
                <li>legal decision automation</li>
                <li>financial risk determination</li>
                <li>employment decision systems</li>
              </ul>
              <p className="text-foreground">unless appropriate safeguards and human oversight are implemented.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Monitoring and Enforcement</h2>
              <p className="text-foreground">Liftor may monitor platform activity to detect violations of this policy.</p>
              <p className="text-foreground">If violations are identified, Liftor may take actions including:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>restricting system access</li>
                <li>suspending accounts</li>
                <li>disabling automation systems</li>
                <li>terminating platform access</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Policy Updates</h2>
              <p className="text-foreground">Liftor may update this AI Usage Policy periodically.</p>
              <p className="text-foreground">Continued use of the platform after updates constitutes acceptance of the revised policy.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIUsagePolicy;
