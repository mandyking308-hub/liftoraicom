import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import {
  Landmark,
  Cog,
  BrainCircuit,
  Activity,
  ShieldCheck,
  FileSearch,
  Workflow,
  Database,
} from "lucide-react";

const systemTypes = [
  { icon: Landmark, title: "Financial Operations Intelligence", desc: "Automated financial data processing, portfolio monitoring, and investment analysis systems." },
  { icon: Cog, title: "Enterprise Automation Platforms", desc: "End-to-end operational automation replacing manual workflows across large-scale organisations." },
  { icon: BrainCircuit, title: "AI Decision Support Systems", desc: "Intelligent systems that analyse data and surface actionable recommendations for strategic decisions." },
  { icon: Activity, title: "Operational Intelligence Platforms", desc: "Real-time monitoring and analytics platforms for enterprise operational performance." },
  { icon: ShieldCheck, title: "AI Compliance Monitoring Systems", desc: "Automated compliance tracking, risk detection, and regulatory reporting infrastructure." },
  { icon: FileSearch, title: "AI Document Processing Systems", desc: "Intelligent document extraction, classification, and processing pipelines at scale." },
  { icon: Workflow, title: "AI Workflow Automation Platforms", desc: "Multi-agent workflow orchestration systems automating complex business processes." },
  { icon: Database, title: "Enterprise Data Intelligence Systems", desc: "Data integration, transformation, and intelligence platforms powering data-driven operations." },
];

const SystemCredibilitySection = () => (
  <section className="py-[100px] max-sm:py-16">
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
          Enterprise AI Infrastructure
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold mb-4">
          Systems Designed with Liftor
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Liftor is used to design and deploy intelligent systems that automate operations, enhance decision-making, and power next-generation organisations.
        </motion.p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {systemTypes.map((item, i) => (
          <motion.div
            key={item.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i * 0.5}
            className="group tech-card !p-6 hover:-translate-y-1 transition-all duration-500"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <item.icon size={20} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SystemCredibilitySection;
