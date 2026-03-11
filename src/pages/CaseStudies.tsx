import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { ArrowRight } from "lucide-react";

const caseStudies = [
  {
    title: "AI Investment Platform",
    category: "Financial Services",
    desc: "A comprehensive AI-powered investment analysis platform providing real-time portfolio intelligence, automated risk assessment, and predictive market analytics.",
  },
  {
    title: "Enterprise Automation System",
    category: "Enterprise",
    desc: "End-to-end operational automation for a large-scale organisation, replacing manual workflows with intelligent agents and automated decision systems.",
  },
  {
    title: "Intelligent Client Portal",
    category: "Family Office",
    desc: "A secure, AI-enhanced client portal providing wealth management insights, automated reporting, and intelligent document processing.",
  },
];

const CaseStudies = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <section className="pt-32 pb-24">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Portfolio
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Case Studies
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            A selection of intelligent systems we have designed, built, and deployed.
          </motion.p>
        </motion.div>
      </div>
    </section>

    <section className="pb-24">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-3">
          {caseStudies.map((cs, i) => (
            <motion.div
              key={cs.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group flex flex-col p-8 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
            >
              <div className="h-40 rounded-lg bg-secondary mb-6 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Case Study Preview</span>
              </div>
              <span className="text-xs font-medium text-primary tracking-widest uppercase mb-2">{cs.category}</span>
              <h3 className="text-xl font-semibold mb-3">{cs.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{cs.desc}</p>
              <div className="mt-6">
                <Button variant="ghost" size="sm" className="text-primary gap-1 px-0 hover:gap-2 transition-all">
                  Read More <ArrowRight size={14} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mt-16 text-center"
        >
          <Button variant="glow" size="lg" asChild>
            <Link to="/project-discovery">Start Your Project</Link>
          </Button>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default CaseStudies;
