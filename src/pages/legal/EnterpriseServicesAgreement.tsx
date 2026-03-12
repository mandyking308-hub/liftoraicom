import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const EnterpriseServicesAgreement = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor Enterprise Services Agreement</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>This Enterprise Services Agreement governs the use of Liftor platform services by organisations and enterprise clients.</p>
              <p>Liftor provides infrastructure enabling organisations to build automation systems, deploy artificial intelligence agents, and operate digital workflows.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Enterprise Accounts</h2>
              <p className="text-foreground">Enterprise clients may create organisational environments within the Liftor platform.</p>
              <p className="text-foreground">Organisations may manage multiple users, workflows, and operational systems through these environments.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Platform Services</h2>
              <p className="text-foreground">Liftor provides infrastructure that enables organisations to deploy automation workflows, AI agents, and operational processes.</p>
              <p className="text-foreground">Services may evolve as the platform develops.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Customer Responsibilities</h2>
              <p className="text-foreground">Enterprise clients are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>configuring their platform environments</li>
                <li>managing user access</li>
                <li>ensuring lawful use of the platform</li>
                <li>ensuring appropriate oversight of automation systems</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Data Responsibilities</h2>
              <p className="text-foreground">Enterprise clients remain responsible for the data submitted to the platform and must ensure they have the legal right to process such data.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Platform Policies</h2>
              <p className="text-foreground">Enterprise clients must comply with all Liftor policies including:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Acceptable Use Policy</li>
                <li>AI Usage Policy</li>
                <li>Automation Safety Policy</li>
                <li>Privacy Policy</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. Service Modifications</h2>
              <p className="text-foreground">Liftor may modify or update platform features as part of ongoing development.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Limitation of Liability</h2>
              <p className="text-foreground">Liftor provides infrastructure tools and is not responsible for operational outcomes produced by client-configured automation systems.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Governing Law</h2>
              <p className="text-foreground">This agreement is governed by the laws of the State of Delaware, United States.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EnterpriseServicesAgreement;
