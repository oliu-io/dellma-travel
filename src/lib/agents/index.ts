import { City, LatentFactor, ForecastDistribution, PreferenceWeights, UtilityScore, ScoutReport, CalibrationData, BTOptimizerResult, DestinationContext } from "@/types";
import {
  buildScoutPrompt,
  buildStateEnumerationPrompt,
  buildForecasterPrompt,
  buildOptimizerPrompt,
  buildAdvocatePrompt,
} from "./prompts";
import {
  scoutSchema,
  stateEnumerationSchema,
  forecasterSchema,
  optimizerSchema,
  advocateSchema,
} from "./schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callLLM(prompt: string, schema: Record<string, any>): Promise<any> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, schema }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `LLM call failed: ${res.status}`);
  }
  const data = await res.json();
  return data.result;
}

// --- Destination context: Wikipedia + REST Countries ---

export async function fetchDestinationContexts(
  cities: City[],
): Promise<DestinationContext[]> {
  const res = await fetch("/api/scout-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cities: cities.map(c => ({ id: c.id, name: c.name, country: c.country })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Context fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.contexts;
}

export async function runScoutAgent(
  cities: City[],
  departureCity: string,
  budget: number,
  duration: number,
  travelStyle: string,
  departureDate: string,
  destinationContexts?: DestinationContext[] | null,
): Promise<ScoutReport[]> {
  const prompt = buildScoutPrompt(cities, departureCity, budget, duration, travelStyle, departureDate, destinationContexts);
  const result = await callLLM(prompt, scoutSchema);
  return result.reports;
}

export async function runStateEnumeration(
  cities: City[],
  departureCity: string,
  scoutReports: Record<string, ScoutReport>,
  tripParams: { budget: number; duration: number; departureDate: string; travelStyle: string },
  calibrationData?: CalibrationData | null,
): Promise<LatentFactor[]> {
  const prompt = buildStateEnumerationPrompt(cities, departureCity, scoutReports, tripParams, calibrationData);
  const result = await callLLM(prompt, stateEnumerationSchema);
  // Normalize cityId: empty string → undefined (LLM returns "" for shared factors)
  return result.factors.map((f: LatentFactor & { cityId?: string }) => ({
    ...f,
    cityId: f.cityId || undefined,
  }));
}

export async function runForecasterAgent(
  cities: City[],
  factors: LatentFactor[],
  tripParams: { budget: number; duration: number; departureDate: string },
  calibrationData?: CalibrationData | null,
): Promise<ForecastDistribution[]> {
  const prompt = buildForecasterPrompt(cities, factors, tripParams, calibrationData);
  const result = await callLLM(prompt, forecasterSchema);
  // Convert array format [{valueId, probability}] to Record<string, number>
  return result.forecasts.map(
    (f: { factorId: string; cityId: string; probabilities: { valueId: string; probability: number }[] }) => ({
      factorId: f.factorId,
      cityId: f.cityId,
      probabilities: Object.fromEntries(
        f.probabilities.map((p: { valueId: string; probability: number }) => [p.valueId, p.probability])
      ),
    })
  );
}

export async function runOptimizerAgent(
  cities: City[],
  forecasts: ForecastDistribution[],
  factors: LatentFactor[],
  weights: PreferenceWeights
): Promise<UtilityScore[]> {
  const prompt = buildOptimizerPrompt(cities, forecasts, factors, weights);
  const result = await callLLM(prompt, optimizerSchema);
  return result.utilities;
}

// --- DeLLMa Bradley-Terry Optimizer ---
// Replaces the LLM-vibes optimizer with real EU computation:
// 1. Sample states from joint forecast distribution
// 2. Build overlapping microbatches of (state, action) tuples
// 3. LLM ranks each microbatch
// 4. Fit Bradley-Terry model via choix
// 5. Marginalize U(s,a) over states to get EU(a)

export async function runBTOptimizer(
  cities: City[],
  factors: LatentFactor[],
  forecasts: ForecastDistribution[],
  weights: PreferenceWeights,
): Promise<BTOptimizerResult> {
  // Restructure forecasts into the format the Python script expects:
  // factor.forecasts = { cityId: { valueId: prob, ... }, ... }
  const factorsWithForecasts = factors.map(f => {
    const factorForecasts: Record<string, Record<string, number>> = {};
    for (const city of cities) {
      const dist = forecasts.find(d => d.factorId === f.id && d.cityId === city.id);
      if (dist) {
        factorForecasts[city.id] = dist.probabilities;
      }
    }
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      ...(f.cityId ? { cityId: f.cityId } : {}),
      plausibleValues: f.plausibleValues.map(v => ({ id: v.id, label: v.label })),
      forecasts: factorForecasts,
    };
  });

  // Action labels for readable prompts
  const actionLabels: Record<string, string> = {};
  for (const c of cities) {
    actionLabels[c.id] = `${c.name}, ${c.country}`;
  }

  const res = await fetch("/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      factors: factorsWithForecasts,
      actions: cities.map(c => c.id),
      actionLabels,
      weights,
      nSamples: 64,
      batchSize: 16,
      overlap: 4,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `BT optimization failed: ${res.status}`);
  }

  return res.json();
}

export interface AdvocateResult {
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

export async function runAdvocateAgent(
  utilities: UtilityScore[],
  cities: City[],
  forecasts: ForecastDistribution[],
  factors: LatentFactor[],
  weights: PreferenceWeights
): Promise<AdvocateResult> {
  const prompt = buildAdvocatePrompt(utilities, cities, forecasts, factors, weights);
  return await callLLM(prompt, advocateSchema);
}

// --- Calibration: Real-world data for grounding forecasts ---

export { type CalibrationData } from "@/types";

export async function fetchCalibrationData(
  cities: City[],
  departureCity: string,
  departureDate: string,
): Promise<CalibrationData> {
  const res = await fetch("/api/calibrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cities: cities.map(c => ({ id: c.id, name: c.name, country: c.country })),
      departureCity,
      departureDate,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Calibration failed: ${res.status}`);
  }
  return res.json();
}
