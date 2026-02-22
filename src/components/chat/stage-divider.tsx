"use client";

import { StageDividerBlock } from "@/types";
import {
  Map,
  BarChart3,
  SlidersHorizontal,
  Sparkles,
  ShieldQuestion,
  Pin,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

const stageIcons: Record<string, LucideIcon> = {
  "Trip Setup": Map,
  "Forecasting": BarChart3,
  "Preferences": SlidersHorizontal,
  "Decision": Sparkles,
  "Challenge": ShieldQuestion,
};

interface StageDividerProps {
  block: StageDividerBlock;
}

export function StageDivider({ block }: StageDividerProps) {
  const Icon = stageIcons[block.title] ?? Pin;

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
