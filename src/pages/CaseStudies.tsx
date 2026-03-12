import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { ArrowRight, Shield } from "lucide-react";

const labelMap: Record<string, string> = {
  architecture: "View Architecture",
  system: "View System",
  platform: "View Platform",
};

const caseStudies = [
  {
    category: "Financial Services",
    title: "AI Investment Intelligence Platform",
    desc: "A data intelligence platform combining real-time portfolio monitoring, automated reporting, and AI-assisted investment analysis. The system integrates financial data sources and generates predictive insights to support strategic investment decisions.",
    link: "/platform",
    linkType: "architecture" as const,
  },
  {
    category: "Enterprise Systems",
    title: "Enterprise Automation Infrastructure",
    desc: "An operational automation platform replacing manual workflows across a large-scale organisation. Intelligent agents process data, coordinate system integrations, and execute automated operational processes.",
    link: "/systems",
    linkType: "system" as const,
  },
  {
    category: "Family Office",
    title: "Intelligent Client Intelligence Portal",
    desc: "A secure operational platform for wealth management teams providing automated reporting, portfolio insights, and document intelligence through integrated AI workflows.",
    link: "/architecture",
    linkType: "platform" as const,
  },
];

const CaseStudies = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-16">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Portfolio
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Case Studies
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed mb-4">
            Examples of intelligent systems designed, engineered, and deployed by Liftor.
          </motion.p>
          <motion.p variants={fadeUp} custom={3} className="text-muted-foreground leading-relaxed">
            A selection of intelligent infrastructure systems demonstrating how Liftor designs automation platforms, AI agents, and operational intelligence environments for modern organisations.
          </motion.p>
          <motion.div variants={fadeUp} custom={4} className="mt-8">
            <div className="w-20 h-px bg-primary/10" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Case Study Grid */}
    <section className="pb-[120px] max-sm:pb-20">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((cs, i) => (
            <motion.div
              key={cs.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group flex flex-col tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <span className="text-xs font-medium text-primary tracking-widest uppercase mb-3">{cs.category}</span>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-foreground transition-colors duration-300">{cs.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{cs.desc}</p>
              <div className="mt-6">
                <Button variant="ghost" size="sm" className="text-primary gap-1 px-0 hover:gap-2 transition-all" asChild>
                  <Link to={cs.link}>{labelMap[cs.linkType]} <ArrowRight size={14} /></Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Confidentiality Statement */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-6">
            <Shield size={22} strokeWidth={1.5} />
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold mb-6">
            Client Confidentiality
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed mb-4">
            Liftor operates under strict confidentiality agreements. Many organisations deploy intelligent systems privately and prefer not to disclose operational infrastructure publicly.
          </motion.p>
          <motion.p variants={fadeUp} custom={3} className="text-muted-foreground leading-relaxed">
            For this reason, Liftor does not publish client identities or sensitive implementation details. The examples shown represent architectural scenarios that illustrate the types of systems engineered by Liftor.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="pb-[120px] max-sm:pb-20 section-dark relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[120px]" />
      <div className="container relative z-10 text-center pt-[120px] max-sm:pt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold mb-4">
            Build Your <span className="text-gradient">Intelligent System</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            Tell us about your organisation and the systems you want to build. Our AI proposal engine will generate a structured solution outline.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button variant="glow" size="lg" className="w-full sm:w-auto shadow-[0_0_30px_-5px_hsl(195_100%_50%/0.25)]" asChild>
              <Link to="/project-discovery">Start Your Project</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default CaseStudies;
