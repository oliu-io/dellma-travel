"use client";

import { create } from "zustand";
import {
  Stage,
  City,
  ScoutReport,
  LatentFactor,
  ForecastDistribution,
  PreferenceWeights,
  UtilityScore,
  SensitivityResult,
  AgentMessage,
  PairwiseComparison,
  CalibrationData,
  BTOptimizerResult,
  ChatBlock,
  NewChatBlock,
  AgentId,
} from "@/types";

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

interface StoreState {
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
  calibrationData: CalibrationData | null;
  weights: PreferenceWeights;
  comparisons: PairwiseComparison[];
  utilities: UtilityScore[];
  sensitivity: SensitivityResult[];
  agentMessages: AgentMessage[];
  chatBlocks: ChatBlock[];
  loading: boolean;
  advocateResult: AdvocateResultData | null;
  btResult: BTOptimizerResult | null;
}

interface StoreActions {
  setStage: (stage: Stage) => void;
  setDepartureCity: (city: string) => void;
  setSelectedCities: (cities: City[]) => void;
  addCity: (city: City) => void;
  removeCity: (cityId: string) => void;
  setTripParams: (params: StoreState["tripParams"]) => void;
  setScoutReports: (reports: Record<string, ScoutReport>) => void;
  setLatentFactors: (factors: LatentFactor[]) => void;
  addLatentFactor: (factor: LatentFactor) => void;
  removeLatentFactor: (factorId: string) => void;
  addPlausibleValue: (factorId: string, value: { id: string; label: string; description: string }) => void;
  removePlausibleValue: (factorId: string, valueId: string) => void;
  setForecasts: (forecasts: ForecastDistribution[]) => void;
  updateForecast: (factorId: string, cityId: string, valueId: string, prob: number) => void;
  setCalibrationData: (data: CalibrationData | null) => void;
  setWeights: (weights: PreferenceWeights) => void;
  setComparisons: (comparisons: PairwiseComparison[]) => void;
  setUtilities: (utilities: UtilityScore[]) => void;
  setSensitivity: (sensitivity: SensitivityResult[]) => void;
  addAgentMessage: (msg: Omit<AgentMessage, "id" | "timestamp">) => void;
  clearAgentMessages: () => void;
  addChatBlock: (block: NewChatBlock) => void;
  addTextMessage: (agent: AgentId, text: string, tone?: "info" | "warning" | "success" | "thinking") => void;
  clearChat: () => void;
  setLoading: (loading: boolean) => void;
  setAdvocateResult: (result: AdvocateResultData | null) => void;
  setBTResult: (result: BTOptimizerResult | null) => void;
  reset: () => void;
}

const initialState: StoreState = {
  stage: "setup",
  departureCity: "",
  selectedCities: [],
  tripParams: {
    budget: 3000,
    duration: 5,
    departureDate: "2026-04-15",
    travelStyle: "balanced",
  },
  scoutReports: {},
  latentFactors: [],
  forecasts: [],
  calibrationData: null,
  weights: { experience: 0.35, cost: 0.25, convenience: 0.2, novelty: 0.2 },
  comparisons: [],
  utilities: [],
  sensitivity: [],
  agentMessages: [],
  chatBlocks: [],
  loading: false,
  advocateResult: null,
  btResult: null,
};

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  ...initialState,

  setStage: (stage) => set({ stage }),
  setDepartureCity: (city) => set({ departureCity: city }),
  setSelectedCities: (cities) => set({ selectedCities: cities }),
  addCity: (city) =>
    set((state) => ({
      selectedCities: state.selectedCities.some((c) => c.id === city.id)
        ? state.selectedCities
        : [...state.selectedCities, city],
    })),
  removeCity: (cityId) =>
    set((state) => ({
      selectedCities: state.selectedCities.filter((c) => c.id !== cityId),
    })),
  setTripParams: (params) => set({ tripParams: params }),
  setScoutReports: (reports) => set({ scoutReports: reports }),
  setLatentFactors: (factors) => set({ latentFactors: factors }),
  addLatentFactor: (factor) =>
    set((state) => ({
      latentFactors: state.latentFactors.some((f) => f.id === factor.id)
        ? state.latentFactors
        : [...state.latentFactors, factor],
    })),
  removeLatentFactor: (factorId) =>
    set((state) => ({
      latentFactors: state.latentFactors.filter((f) => f.id !== factorId),
      // Also remove associated forecasts
      forecasts: state.forecasts.filter((f) => f.factorId !== factorId),
    })),
  addPlausibleValue: (factorId, value) =>
    set((state) => ({
      latentFactors: state.latentFactors.map((f) => {
        if (f.id !== factorId) return f;
        if (f.plausibleValues.some((v) => v.id === value.id)) return f;
        return { ...f, plausibleValues: [...f.plausibleValues, value] };
      }),
    })),
  removePlausibleValue: (factorId, valueId) =>
    set((state) => ({
      latentFactors: state.latentFactors.map((f) => {
        if (f.id !== factorId) return f;
        return {
          ...f,
          plausibleValues: f.plausibleValues.filter((v) => v.id !== valueId),
        };
      }),
      // Also remove the value from forecasts and re-normalize
      forecasts: state.forecasts.map((fc) => {
        if (fc.factorId !== factorId) return fc;
        const newProbs = { ...fc.probabilities };
        delete newProbs[valueId];
        const total = Object.values(newProbs).reduce((s, v) => s + v, 0);
        if (total > 0) {
          for (const k of Object.keys(newProbs)) {
            newProbs[k] = newProbs[k] / total;
          }
        }
        return { ...fc, probabilities: newProbs };
      }),
    })),
  setForecasts: (forecasts) => set({ forecasts }),
  setCalibrationData: (data) => set({ calibrationData: data }),
  updateForecast: (factorId, cityId, valueId, prob) => {
    const forecasts = get().forecasts.map((f) => {
      if (f.factorId === factorId && f.cityId === cityId) {
        const newProbs = { ...f.probabilities, [valueId]: prob };
        const total = Object.values(newProbs).reduce((s, v) => s + v, 0);
        if (total > 0) {
          for (const k of Object.keys(newProbs)) {
            newProbs[k] = newProbs[k] / total;
          }
        }
        return { ...f, probabilities: newProbs };
      }
      return f;
    });
    set({ forecasts });
  },
  setWeights: (weights) => set({ weights }),
  setComparisons: (comparisons) => set({ comparisons }),
  setUtilities: (utilities) => set({ utilities }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  addAgentMessage: (msg) =>
    set((state) => ({
      agentMessages: [
        ...state.agentMessages,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
      ],
    })),
  clearAgentMessages: () => set({ agentMessages: [] }),
  addChatBlock: (block) =>
    set((state) => ({
      chatBlocks: [
        ...state.chatBlocks,
        { ...block, id: crypto.randomUUID(), timestamp: Date.now() } as ChatBlock,
      ],
    })),
  addTextMessage: (agent, text, tone = "info") =>
    set((state) => ({
      chatBlocks: [
        ...state.chatBlocks,
        {
          kind: "text" as const,
          agent,
          text,
          tone,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),
  clearChat: () => set({ chatBlocks: [] }),
  setLoading: (loading) => set({ loading }),
  setAdvocateResult: (result) => set({ advocateResult: result }),
  setBTResult: (result) => set({ btResult: result }),
  reset: () => set(initialState),
}));
