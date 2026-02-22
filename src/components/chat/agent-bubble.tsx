"use client";

import { AgentId } from "@/types";
import {
  Compass,
  BarChart3,
  SlidersHorizontal,
  Sparkles,
  ShieldQuestion,
  Bike,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

const agentMeta: Record<AgentId, { Icon: LucideIcon; label: string; color: string; bgColor: string }> = {
  scout:      { Icon: Compass,            label: "Scout",       color: "text-amber-700",   bgColor: "bg-amber-100" },
  forecaster: { Icon: BarChart3,           label: "Forecaster",  color: "text-teal-700",    bgColor: "bg-teal-100" },
  preference: { Icon: SlidersHorizontal,   label: "Preference",  color: "text-orange-700",  bgColor: "bg-orange-100" },
  optimizer:  { Icon: Sparkles,            label: "Optimizer",   color: "text-emerald-700", bgColor: "bg-emerald-100" },
  advocate:   { Icon: ShieldQuestion,      label: "Advocate",    color: "text-rose-700",    bgColor: "bg-rose-100" },
  system:     { Icon: Bike,                label: "DeLLMa",      color: "text-stone-600",   bgColor: "bg-stone-100" },
};

interface AgentBubbleProps {
  agent: AgentId;
  children: React.ReactNode;
}

export function AgentBubble({ agent, children }: AgentBubbleProps) {
  const meta = agentMeta[agent] ?? agentMeta.system;
  const { Icon } = meta;

  return (
    <div className="flex items-start gap-3 w-full">
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${meta.bgColor} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${meta.color}`} strokeWidth={2} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
