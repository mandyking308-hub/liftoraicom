import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const DataProcessingAgreement = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor Data Processing Agreement</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>This Data Processing Agreement ("DPA") forms part of the legal framework governing use of the Liftor platform.</p>
              <p>This DPA describes how personal data is processed when organisations use the Liftor platform and services.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Definitions</h2>
              <p className="text-foreground">For the purposes of this agreement:</p>
              <p className="text-foreground">Customer refers to the organisation or entity using the Liftor platform.</p>
              <p className="text-foreground">Processor refers to Liftor, which processes data on behalf of the Customer.</p>
              <p className="text-foreground">Personal Data refers to any information relating to an identified or identifiable individual.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Roles of the Parties</h2>
              <p className="text-foreground">When organisations use the Liftor platform, the Customer acts as the data controller and Liftor acts as the data processor for personal data submitted to the platform.</p>
              <p className="text-foreground">Liftor processes data only in accordance with the instructions of the Customer and the operation of the platform.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Nature of Processing</h2>
              <p className="text-foreground">Liftor provides infrastructure that enables organisations to deploy automation workflows, AI agents, and operational processes.</p>
              <p className="text-foreground">Personal data may be processed as part of platform operations including:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>automation execution</li>
                <li>workflow processing</li>
                <li>system monitoring</li>
                <li>platform functionality</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Security Measures</h2>
              <p className="text-foreground">Liftor implements technical and organisational measures designed to protect personal data processed through the platform.</p>
              <p className="text-foreground">These measures may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>encryption of communications</li>
                <li>infrastructure access controls</li>
                <li>monitoring and logging systems</li>
                <li>authentication and identity management</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Subprocessors</h2>
              <p className="text-foreground">Liftor may use infrastructure providers and service partners to support operation of the platform.</p>
              <p className="text-foreground">These providers may process data as subprocessors.</p>
              <p className="text-foreground">Liftor works with service providers that support secure and reliable platform operations.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. International Transfers</h2>
              <p className="text-foreground">Liftor operates globally and may process data in multiple jurisdictions.</p>
              <p className="text-foreground">Where required by applicable law, appropriate safeguards will be implemented to support lawful international data transfers.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Data Subject Rights</h2>
              <p className="text-foreground">Customers are responsible for handling requests from individuals regarding their personal data.</p>
              <p className="text-foreground">Liftor will provide reasonable assistance to customers in responding to such requests where applicable.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Data Breach Response</h2>
              <p className="text-foreground">If Liftor becomes aware of a security incident affecting personal data, appropriate investigation and response procedures will be initiated.</p>
              <p className="text-foreground">Where required, affected parties may be notified in accordance with applicable laws.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">9. Data Retention and Deletion</h2>
              <p className="text-foreground">Liftor retains data only as long as necessary to operate the platform and fulfil contractual and legal obligations.</p>
              <p className="text-foreground">Customers may request deletion of data in accordance with applicable platform functionality.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">10. Updates to This Agreement</h2>
              <p className="text-foreground">Liftor may update this Data Processing Agreement periodically to reflect changes in law, regulation, or platform operations.</p>
              <p className="text-foreground">Continued use of the platform after updates constitutes acceptance of the revised agreement.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DataProcessingAgreement;
