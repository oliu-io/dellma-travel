"use client";

import type { ChatBlock, TextBlock, StageDividerBlock, ActionButtonsBlock } from "@/lib/dellma/types";
import { getDomainConfig } from "@/lib/dellma/active-domain";
import { TextMessage } from "./text-message";
import { StageDivider } from "./stage-divider";
import { ActionButtonsRow } from "./action-buttons-row";
import { AgentBubble } from "./agent-bubble";
import { FactorEditorBlock } from "./blocks/factor-editor-block";
import { ForecastSlidersBlock } from "./blocks/forecast-sliders-block";
import { WeightSlidersBlock } from "./blocks/weight-sliders-block";
import { RankingResultsBlock } from "./blocks/ranking-results-block";
import { DecisionNetworkBlock } from "./blocks/decision-network-block";
import { AdvocateResultBlock } from "./blocks/advocate-result-block";

interface BlockRendererProps {
  block: ChatBlock;
  locked: boolean;
  consumed: boolean;
  onAction: (action: string) => void;
}

export function BlockRenderer({ block, locked, consumed, onAction }: BlockRendererProps) {
  // NOTE: ChatBlock union includes InteractiveBlock with `kind: string`, so TypeScript
  // cannot narrow discriminated unions in a switch. We use type assertions for blocks
  // that carry extra properties (text, stage-divider, action-buttons).
  switch (block.kind) {
    case "text":
      return <TextMessage block={block as TextBlock} />;

    case "stage-divider":
      return <StageDivider block={block as StageDividerBlock} />;

    case "action-buttons":
      return <ActionButtonsRow block={block as ActionButtonsBlock} consumed={consumed} onAction={onAction} />;

    // --- Framework blocks ---
    case "factor-editor":
      return (
        <AgentBubble agent={block.agent}>
          <FactorEditorBlock locked={locked} />
        </AgentBubble>
      );

    case "forecast-sliders":
      return (
        <AgentBubble agent={block.agent}>
          <ForecastSlidersBlock locked={locked} />
        </AgentBubble>
      );

    case "weight-sliders":
      return (
        <AgentBubble agent={block.agent}>
          <WeightSlidersBlock locked={locked} />
        </AgentBubble>
      );

    case "pairwise":
      return null;

    case "ranking-results":
      return (
        <AgentBubble agent={block.agent}>
          <RankingResultsBlock locked={locked} />
        </AgentBubble>
      );

    case "decision-network":
      return (
        <AgentBubble agent={block.agent}>
          <DecisionNetworkBlock locked={locked} />
        </AgentBubble>
      );

    case "advocate-result":
      return (
        <AgentBubble agent={block.agent}>
          <AdvocateResultBlock locked={locked} />
        </AgentBubble>
      );

    default: {
      // Domain-specific blocks — look up in the domain's block registry
      const config = getDomainConfig();
      const DomainBlock = config.blockRegistry[block.kind];
      if (DomainBlock) {
        // Setup-phase blocks are rendered without AgentBubble wrapper
        const setupBlocks = new Set(["trip-params", "city-selection"]);
        if (setupBlocks.has(block.kind)) {
          return (
            <div className="pl-11">
              <DomainBlock locked={locked} />
            </div>
          );
        }
        return (
          <AgentBubble agent={block.agent}>
            <DomainBlock locked={locked} />
          </AgentBubble>
        );
      }
      return null;
    }
  }
}
