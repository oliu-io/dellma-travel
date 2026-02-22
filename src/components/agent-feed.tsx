"use client";

import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

const agentIcons: Record<string, string> = {
  scout: "🔍",
  forecaster: "📊",
  preference: "⚖️",
  optimizer: "🧮",
  advocate: "😈",
};

const agentColors: Record<string, string> = {
  scout: "text-blue-400",
  forecaster: "text-purple-400",
  preference: "text-amber-400",
  optimizer: "text-green-400",
  advocate: "text-red-400",
};

export function AgentFeed() {
  const messages = useStore((s) => s.agentMessages);

  if (messages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-4">
        Agent activity will appear here...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-2 text-sm rounded-md bg-muted/50 p-2"
          >
            <span className="text-base flex-shrink-0">
              {agentIcons[msg.agent] ?? "🤖"}
            </span>
            <div className="min-w-0">
              <span
                className={`font-medium capitalize text-xs ${agentColors[msg.agent] ?? ""}`}
              >
                {msg.agent}
              </span>
              <p className="text-muted-foreground mt-0.5 break-words">
                {msg.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
