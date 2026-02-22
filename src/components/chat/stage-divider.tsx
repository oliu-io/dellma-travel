"use client";

import type { StageDividerBlock } from "@/lib/dellma/types";
import { getDomainConfig } from "@/lib/dellma/active-domain";
import { Pin } from "lucide-react";

interface StageDividerProps {
  block: StageDividerBlock;
}

export function StageDivider({ block }: StageDividerProps) {
  const config = getDomainConfig();
  // Find stage by label match
  const stage = config.stages.find((s) => block.title.includes(s.label));
  const Icon = stage?.Icon ?? Pin;

  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-border" />
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-sm font-semibold text-foreground">
        <Icon className="w-4 h-4" strokeWidth={2} />
        <span>{block.title}</span>
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
