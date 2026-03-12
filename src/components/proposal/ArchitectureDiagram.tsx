import { motion } from "framer-motion";
import { useState } from "react";
import { Bot, Layers, Workflow, Plug, Monitor, Cpu } from "lucide-react";

interface ArchComponent {
  name: string;
  type: string;
}

const typeConfig: Record<string, { icon: typeof Cpu; color: string; label: string }> = {
  interface: { icon: Monitor, color: "bg-primary/20 text-primary border-primary/30", label: "Interface" },
  agent: { icon: Bot, color: "bg-green-500/20 text-green-400 border-green-500/30", label: "AI Agent" },
  workflow: { icon: Workflow, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Workflow" },
  system: { icon: Cpu, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "System" },
  integration: { icon: Plug, color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Integration" },
};

const sortOrder: Record<string, number> = {
  interface: 0,
  system: 1,
  workflow: 2,
  agent: 3,
  integration: 4,
};

interface Props {
  components: ArchComponent[];
}

const ArchitectureDiagram = ({ components }: Props) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const sorted = [...components].sort(
    (a, b) => (sortOrder[a.type] ?? 5) - (sortOrder[b.type] ?? 5)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers size={18} className="text-primary" />
        <h3 className="text-xs font-medium text-primary tracking-widest uppercase">
          System Architecture Overview
        </h3>
      </div>

      <div className="flex flex-col items-center gap-1">
        {sorted.map((comp, i) => {
          const config = typeConfig[comp.type] || typeConfig.system;
          const Icon = config.icon;
          const isExpanded = expandedIdx === i;

          return (
            <div key={i} className="flex flex-col items-center w-full max-w-xs">
              {i > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-px h-4 bg-border" />
                  <svg width="12" height="8" viewBox="0 0 12 8" className="text-muted-foreground">
                    <path d="M6 8L0 0h12z" fill="currentColor" />
                  </svg>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={`w-full px-5 py-3 rounded-lg border cursor-pointer transition-all ${config.color} ${
                  isExpanded ? "ring-1 ring-primary/40" : ""
                }`}
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span className="text-sm font-medium flex-1">{comp.name}</span>
                </div>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 pt-2 border-t border-current/10"
                  >
                    <p className="text-xs opacity-70">
                      Type: {config.label}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 justify-center pt-3">
        {Object.entries(typeConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon size={12} />
              <span>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
