import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Building2, Landmark, Briefcase, Rocket } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const industries = [
  {
    icon: Building2,
    title: "Enterprise Organisations",
    desc: "Automation of complex operational systems. We help large organisations streamline their operations through intelligent AI systems that integrate with existing infrastructure.",
  },
  {
    icon: Landmark,
    title: "Financial Services",
    desc: "Data platforms and reporting automation. From real-time analytics dashboards to automated compliance reporting, we build the data infrastructure financial institutions need.",
  },
  {
    icon: Briefcase,
    title: "Family Offices",
    desc: "Private AI infrastructure for wealth management. Secure, bespoke platforms that provide portfolio intelligence, automated reporting, and operational efficiency.",
  },
  {
    icon: Rocket,
    title: "Startups",
    desc: "Building AI-native companies from idea to platform. We partner with founders to engineer the core technology that powers their vision, from MVP to scale.",
  },
];

const Industries = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <section className="pt-32 pb-24">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Sectors
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Industries We Serve
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            We work with organisations across sectors that demand precision, security, and intelligent automation.
          </motion.p>
        </motion.div>
      </div>
    </section>

    <section className="pb-24">
      <div className="container space-y-8">
        {industries.map((ind, i) => (
          <motion.div
            key={ind.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="flex flex-col md:flex-row gap-6 p-8 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
          >
            <div className="flex-shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary">
              <ind.icon size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">{ind.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{ind.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>

    <Footer />
  </div>
);

export default Industries;
