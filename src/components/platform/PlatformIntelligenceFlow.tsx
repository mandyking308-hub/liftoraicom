import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Database, GitBranch, Brain, Workflow, Monitor } from "lucide-react";

const flowNodes = [
  { icon: Database, title: "Enterprise Data Sources", desc: "Operational systems, financial platforms, CRM systems, and internal databases." },
  { icon: GitBranch, title: "Data Ingestion Pipelines", desc: "Secure data ingestion and processing pipelines that prepare operational data streams." },
  { icon: Brain, title: "AI Intelligence Engine", desc: "Machine learning models and AI agents that analyse data and generate predictive insights." },
  { icon: Workflow, title: "Automation Workflows", desc: "Intelligent workflow orchestration that triggers automated processes and system actions." },
  { icon: Monitor, title: "Operational Dashboards", desc: "User interfaces that display insights, reports, and system performance metrics." },
];

const PlatformIntelligenceFlow = () => (
  <section className="py-[120px] max-sm:py-20">
    <div className="container">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center mb-14">
        <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
          Architecture
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold mb-4">
          Platform Intelligence Flow
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
          The Liftor platform processes enterprise data through a layered intelligence architecture that transforms operational signals into automated decisions and insights.
        </motion.p>
      </motion.div>

      <div className="flex flex-col items-center max-w-lg mx-auto">
        {flowNodes.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={node.title} className="flex flex-col items-center w-full">
              {i > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-border" />
                  <svg width="14" height="10" viewBox="0 0 14 10" className="text-primary/60">
                    <path d="M7 10L0 0h14z" fill="currentColor" />
                  </svg>
                  <div className="w-px h-4 bg-border" />
                </div>
              )}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="tech-card !p-6 w-full"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{node.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{node.desc}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default PlatformIntelligenceFlow;
