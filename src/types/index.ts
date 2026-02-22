// Core DeLLMa types for travel decision-making under uncertainty

export interface City {
  id: string;
  name: string;
  country: string;
  imageUrl: string; // Unsplash photo URL
  icon: string; // Lucide icon name (e.g. "landmark", "palmtree")
  // No hardcoded costs/weather — the Scout agent will infer context,
  // and the Forecaster will enumerate latent state variables.
}

export interface ScoutReport {
  cityId: string;
  summary: string;
  highlights: string[];
  considerations: string[];
  bestTimeFactors: string[];
}

export interface LatentFactor {
  id: string;
  name: string;
  description: string;
  plausibleValues: PlausibleValue[];
  /** If set, this factor only applies to a specific destination (action). */
  cityId?: string;
}

export interface PlausibleValue {
  id: string;
  label: string;
  description: string;
}

export interface ForecastDistribution {
  factorId: string;
  cityId: string;
  probabilities: Record<string, number>; // valueId -> probability
}

export interface PreferenceWeights {
  experience: number;
  cost: number;
  convenience: number;
  novelty: number;
}

export interface PairwiseComparison {
  id: string;
  stateActionA: { cityId: string; state: Record<string, string> };
  stateActionB: { cityId: string; state: Record<string, string> };
  preferred?: "A" | "B" | null; // null = not yet judged
  source: "llm" | "human";
}

export interface UtilityScore {
  cityId: string;
  expectedUtility: number;
  breakdown: {
    experience: number;
    cost: number;
    convenience: number;
    novelty: number;
  };
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
  agent: "scout" | "forecaster" | "preference" | "optimizer" | "advocate";
  message: string;
  timestamp: number;
  type: "info" | "warning" | "success" | "thinking";
}

// Calibration data from real-world APIs (weather + flights)
export interface CalibrationWeather {
  city: string;
  temperature_c: number;
  feels_like_c: number;
  humidity: number;
  weather_desc: string;
  precipitation_mm: number;
  wind_kph: number;
  forecast_avg_temp_c?: number;
  forecast_desc?: string;
}

export interface CalibrationFlight {
  city: string;
  cheapest_price: number;
  median_price: number;
  price_range: { min: number; max: number };
  options_found: number;
  cheapest_airline: string;
  cheapest_duration_minutes: number;
  cheapest_stops: number;
}

// Destination context from Wikipedia + REST Countries (for Scout grounding)
export interface DestinationContext {
  cityId: string;
  cityName: string;
  country: string;
  wiki: {
    title: string;
    description: string;
    extract: string;
  } | null;
  countryInfo: {
    currencies: string;
    languages: string;
    timezones: string[];
    capital: string;
  } | null;
}

export interface CalibrationData {
  weather: Record<string, CalibrationWeather>;
  flights: Record<string, CalibrationFlight>;
  errors: string[];
}

export type Stage = "setup" | "forecast" | "preferences" | "decision" | "challenge";

// --- Chat Block types for the scrollable chat interface ---

export type AgentId = "scout" | "forecaster" | "preference" | "optimizer" | "advocate" | "system";

export type ChatBlockKind =
  | "text"
  | "stage-divider"
  | "action-buttons"
  | "trip-params"
  | "city-selection"
  | "scout-reports"
  | "calibration"
  | "factor-editor"
  | "forecast-sliders"
  | "weight-sliders"
  | "pairwise"
  | "ranking-results"
  | "decision-network"
  | "advocate-result";

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
  kind:
    | "trip-params"
    | "city-selection"
    | "scout-reports"
    | "calibration"
    | "factor-editor"
    | "forecast-sliders"
    | "weight-sliders"
    | "pairwise"
    | "ranking-results"
    | "decision-network"
    | "advocate-result";
}

export type ChatBlock = TextBlock | StageDividerBlock | ActionButtonsBlock | InteractiveBlock;

/** Distributes Omit across the union so discriminated narrowing still works */
export type NewChatBlock =
  | Omit<TextBlock, "id" | "timestamp">
  | Omit<StageDividerBlock, "id" | "timestamp">
  | Omit<ActionButtonsBlock, "id" | "timestamp">
  | Omit<InteractiveBlock, "id" | "timestamp">;

export interface DecisionState {
  stage: Stage;
  departureCity: string;
  selectedCities: City[];
  tripParams: {
    budget: number;
    duration: number;
    departureDate: string;
    travelStyle: string;
  };
  scoutReports: Record<string, ScoutReport>;
  latentFactors: LatentFactor[];
  forecasts: ForecastDistribution[];
  weights: PreferenceWeights;
  comparisons: PairwiseComparison[];
  utilities: UtilityScore[];
  sensitivity: SensitivityResult[];
  agentMessages: AgentMessage[];
}
