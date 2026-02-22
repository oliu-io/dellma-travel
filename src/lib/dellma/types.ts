// ============================================================================
// DeLLMa Framework Types — Domain-agnostic DMUU (Decision-Making Under Uncertainty)
// ============================================================================

export interface LatentFactor {
  id: string;
  name: string;
  description: string;
  plausibleValues: PlausibleValue[];
  /** If set, this factor only applies to a specific action (e.g. a destination, a candidate). */
  actionId?: string;
  /** @deprecated Alias for actionId — used in travel domain as cityId */
  cityId?: string;
}

export interface PlausibleValue {
  id: string;
  label: string;
  description: string;
}

export interface ForecastDistribution {
  factorId: string;
  cityId: string; // actionId — kept as cityId for backward compat
  probabilities: Record<string, number>; // valueId -> probability
}

export interface PairwiseComparison {
  id: string;
  stateActionA: { cityId: string; state: Record<string, string> };
  stateActionB: { cityId: string; state: Record<string, string> };
  preferred?: "A" | "B" | null;
  source: "llm" | "human";
}

export interface UtilityScore {
  cityId: string; // actionId
  expectedUtility: number;
  breakdown: Record<string, number>;
}

// Bradley-Terry optimizer result (DeLLMa-style)
export interface BTOptimizerResult {
  expectedUtilities: Record<string, number>; // action -> EU
  ranking: { action: string; expectedUtility: number }[];
  perStateUtilities: Record<string, number[]>; // action -> U(s,a) per state
  nPairwiseComparisons: number;
  nBatches: number;
  // Decision network visualization data (piped from prepare phase)
  stateProbs?: Record<string, number[]>; // action -> P(s|a) per sampled state
  stateDescriptions?: Record<string, string>[]; // array of {factorId: valueId} dicts
}

export interface SensitivityResult {
  cityId: string;
  cityName: string;
  factorId: string;
  factorName: string;
  originalRank: number;
  newRank: number;
  condition: string;
  utilityDelta: number;
}

export interface AgentMessage {
  id: string;
  agent: AgentId;
  message: string;
  timestamp: number;
  type: "info" | "warning" | "success" | "thinking";
}

export interface AdvocateResultData {
  topChoiceRisks: { risk: string; severity: string; likelihood: string }[];
  alternativeScenario: {
    condition: string;
    betterChoice: string;
    betterChoiceName: string;
    explanation: string;
  };
  hiddenAssumption: string;
  questionForUser: string;
}

// --- Agent IDs (common across domains) ---
export type AgentId = "scout" | "forecaster" | "preference" | "optimizer" | "advocate" | "system";

// --- Chat Block types for the scrollable chat interface ---

export type ChatBlockKind =
  | "text"
  | "stage-divider"
  | "action-buttons"
  // Framework interactive blocks
  | "factor-editor"
  | "forecast-sliders"
  | "weight-sliders"
  | "pairwise"
  | "ranking-results"
  | "decision-network"
  | "advocate-result"
  // Domain-specific blocks are registered via DomainConfig.blockRegistry
  // and use string literal types (e.g. "trip-params", "city-selection")
  | (string & {});

interface ChatBlockBase {
  id: string;
  timestamp: number;
  agent: AgentId;
}

/** Text message block (agent says something) */
export interface TextBlock extends ChatBlockBase {
  kind: "text";
  text: string;
  tone: "info" | "warning" | "success" | "thinking";
}

/** Stage separator shown between phases */
export interface StageDividerBlock extends ChatBlockBase {
  kind: "stage-divider";
  title: string;
}

/** Row of action buttons the user can click */
export interface ActionButtonsBlock extends ChatBlockBase {
  kind: "action-buttons";
  buttons: { label: string; action: string; variant: "default" | "outline" }[];
}

/** Interactive or content blocks — data lives in the Zustand store, these are pointers */
export interface InteractiveBlock extends ChatBlockBase {
  kind: string; // extensible — framework + domain block kinds
}

export type ChatBlock = TextBlock | StageDividerBlock | ActionButtonsBlock | InteractiveBlock;

/** Distributes Omit across the union so discriminated narrowing still works */
export type NewChatBlock =
  | Omit<TextBlock, "id" | "timestamp">
  | Omit<StageDividerBlock, "id" | "timestamp">
  | Omit<ActionButtonsBlock, "id" | "timestamp">
  | Omit<InteractiveBlock, "id" | "timestamp">;
