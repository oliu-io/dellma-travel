"use client";

import type { AgentId } from "@/lib/dellma/types";
import { getDomainConfig } from "@/lib/dellma/active-domain";

interface AgentBubbleProps {
  agent: AgentId;
  children: React.ReactNode;
}

export function AgentBubble({ agent, children }: AgentBubbleProps) {
  const config = getDomainConfig();
  const meta = config.agentMeta[agent] ?? config.agentMeta.system;
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
