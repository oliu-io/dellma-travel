"use client";

import type { TextBlock } from "@/lib/dellma/types";
import { AgentBubble } from "./agent-bubble";
import { Loader2 } from "lucide-react";

const toneStyles: Record<TextBlock["tone"], string> = {
  info: "text-foreground/80",
  warning: "text-amber-700",
  success: "text-emerald-700",
  thinking: "text-muted-foreground italic",
};

interface TextMessageProps {
  block: TextBlock;
}

export function TextMessage({ block }: TextMessageProps) {
  return (
    <AgentBubble agent={block.agent}>
      <p className={`text-sm leading-relaxed ${toneStyles[block.tone]}`}>
        {block.tone === "thinking" && (
          <Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin text-muted-foreground" />
        )}
        {block.text}
      </p>
    </AgentBubble>
  );
}
