import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

const AIOutputDisclaimer = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="AI output disclaimer | Liftor AI" description="Disclaimer covering AI-generated outputs produced by Liftor AI systems." />
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">AI Output Disclaimer</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[18px] text-foreground">
            <p>Liftor provides artificial intelligence systems that generate outputs based on user inputs and automation workflows.</p>
            <p>AI-generated outputs may not always be accurate, complete, or reliable.</p>
            <p>Users remain responsible for evaluating and verifying AI-generated information before relying on it.</p>
            <p>AI outputs should not be used as the sole basis for decisions that could have legal, financial, medical, or other significant consequences without appropriate human review.</p>
            <p>Liftor does not guarantee the accuracy or reliability of AI-generated outputs.</p>
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

export default AIOutputDisclaimer;
