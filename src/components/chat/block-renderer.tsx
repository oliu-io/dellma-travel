"use client";

import { ChatBlock } from "@/types";
import { TextMessage } from "./text-message";
import { StageDivider } from "./stage-divider";
import { ActionButtonsRow } from "./action-buttons-row";
import { AgentBubble } from "./agent-bubble";
import { TripParamsBlock } from "./blocks/trip-params-block";
import { CitySelectionBlock } from "./blocks/city-selection-block";
import { ScoutReportsBlock } from "./blocks/scout-reports-block";
import { CalibrationBlock } from "./blocks/calibration-block";
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
  switch (block.kind) {
    case "text":
      return <TextMessage block={block} />;

    case "stage-divider":
      return <StageDivider block={block} />;

    case "action-buttons":
      return <ActionButtonsRow block={block} consumed={consumed} onAction={onAction} />;

    // --- Setup blocks ---
    case "trip-params":
      return (
        <div className="pl-11">
          <TripParamsBlock locked={locked} />
        </div>
      );

    case "city-selection":
      return (
        <div className="pl-11">
          <CitySelectionBlock locked={locked} />
        </div>
      );

    case "scout-reports":
      return (
        <AgentBubble agent={block.agent}>
          <ScoutReportsBlock locked={locked} />
        </AgentBubble>
      );

    // --- Forecast blocks ---
    case "calibration":
      return (
        <AgentBubble agent={block.agent}>
          <CalibrationBlock locked={locked} />
        </AgentBubble>
      );

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

    // --- Preferences blocks ---
    case "weight-sliders":
      return (
        <AgentBubble agent={block.agent}>
          <WeightSlidersBlock locked={locked} />
        </AgentBubble>
      );

    case "pairwise":
      // Pairwise comparisons not used in BT optimizer flow
      return null;

    // --- Decision blocks ---
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

    // --- Challenge blocks ---
    case "advocate-result":
      return (
        <AgentBubble agent={block.agent}>
          <AdvocateResultBlock locked={locked} />
        </AgentBubble>
      );

    default:
      return null;
  }
}
