"use client";

// ============================================================================
// DeLLMa Framework Store — Generic Zustand store factory
// ============================================================================

import { create, type StoreApi, type UseBoundStore } from "zustand";
import type {
  LatentFactor,
  ForecastDistribution,
  PairwiseComparison,
  UtilityScore,
  SensitivityResult,
  AgentMessage,
  BTOptimizerResult,
  ChatBlock,
  NewChatBlock,
  AgentId,
  AdvocateResultData,
} from "./types";
import type { DomainConfig } from "./domain-config";

// ── Framework State ──────────────────────────────────────────────────────────

export interface FrameworkState {
  stage: string;
  latentFactors: LatentFactor[];
  forecasts: ForecastDistribution[];
  weights: Record<string, number>;
  comparisons: PairwiseComparison[];
  utilities: UtilityScore[];
  sensitivity: SensitivityResult[];
  agentMessages: AgentMessage[];
  chatBlocks: ChatBlock[];
  loading: boolean;
  advocateResult: AdvocateResultData | null;
  btResult: BTOptimizerResult | null;
}

export interface FrameworkActions {
  setStage: (stage: string) => void;
  setLatentFactors: (factors: LatentFactor[]) => void;
  addLatentFactor: (factor: LatentFactor) => void;
  removeLatentFactor: (factorId: string) => void;
  addPlausibleValue: (factorId: string, value: { id: string; label: string; description: string }) => void;
  removePlausibleValue: (factorId: string, valueId: string) => void;
  setForecasts: (forecasts: ForecastDistribution[]) => void;
  updateForecast: (factorId: string, cityId: string, valueId: string, prob: number) => void;
  setWeights: (weights: Record<string, number>) => void;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DellmaStore = FrameworkState & FrameworkActions & Record<string, any>;

// ── Store Factory ────────────────────────────────────────────────────────────

// Module-level store singleton (created on first call)
let _store: UseBoundStore<StoreApi<DellmaStore>> | null = null;

export function createDellmaStore(config: DomainConfig) {
  const frameworkInitial: FrameworkState = {
    stage: config.stages[0]?.key ?? "setup",
    latentFactors: [],
    forecasts: [],
    weights: { ...config.defaultWeights },
    comparisons: [],
    utilities: [],
    sensitivity: [],
    agentMessages: [],
    chatBlocks: [],
    loading: false,
    advocateResult: null,
    btResult: null,
  };

  const fullInitial = {
    ...frameworkInitial,
    ...config.initialDomainState,
  };

  _store = create<DellmaStore>((set, get) => ({
    ...fullInitial,

    // ── Framework Actions ──────────────────────────────────────────────

    setStage: (stage: string) => set({ stage }),
    setLatentFactors: (factors: LatentFactor[]) => set({ latentFactors: factors }),
    addLatentFactor: (factor: LatentFactor) =>
      set((state: FrameworkState) => ({
        latentFactors: state.latentFactors.some((f) => f.id === factor.id)
          ? state.latentFactors
          : [...state.latentFactors, factor],
      })),
    removeLatentFactor: (factorId: string) =>
      set((state: FrameworkState) => ({
        latentFactors: state.latentFactors.filter((f) => f.id !== factorId),
        forecasts: state.forecasts.filter((f) => f.factorId !== factorId),
      })),
    addPlausibleValue: (factorId: string, value: { id: string; label: string; description: string }) =>
      set((state: FrameworkState) => ({
        latentFactors: state.latentFactors.map((f) => {
          if (f.id !== factorId) return f;
          if (f.plausibleValues.some((v) => v.id === value.id)) return f;
          return { ...f, plausibleValues: [...f.plausibleValues, value] };
        }),
      })),
    removePlausibleValue: (factorId: string, valueId: string) =>
      set((state: FrameworkState) => ({
        latentFactors: state.latentFactors.map((f) => {
          if (f.id !== factorId) return f;
          return {
            ...f,
            plausibleValues: f.plausibleValues.filter((v) => v.id !== valueId),
          };
        }),
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
    setForecasts: (forecasts: ForecastDistribution[]) => set({ forecasts }),
    updateForecast: (factorId: string, cityId: string, valueId: string, prob: number) => {
      const forecasts = (get() as FrameworkState).forecasts.map((f) => {
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
    setWeights: (weights: Record<string, number>) => set({ weights }),
    setComparisons: (comparisons: PairwiseComparison[]) => set({ comparisons }),
    setUtilities: (utilities: UtilityScore[]) => set({ utilities }),
    setSensitivity: (sensitivity: SensitivityResult[]) => set({ sensitivity }),
    addAgentMessage: (msg: Omit<AgentMessage, "id" | "timestamp">) =>
      set((state: FrameworkState) => ({
        agentMessages: [
          ...state.agentMessages,
          { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
        ],
      })),
    clearAgentMessages: () => set({ agentMessages: [] }),
    addChatBlock: (block: NewChatBlock) =>
      set((state: FrameworkState) => ({
        chatBlocks: [
          ...state.chatBlocks,
          { ...block, id: crypto.randomUUID(), timestamp: Date.now() } as ChatBlock,
        ],
      })),
    addTextMessage: (agent: AgentId, text: string, tone: "info" | "warning" | "success" | "thinking" = "info") =>
      set((state: FrameworkState) => ({
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
    setLoading: (loading: boolean) => set({ loading }),
    setAdvocateResult: (result: AdvocateResultData | null) => set({ advocateResult: result }),
    setBTResult: (result: BTOptimizerResult | null) => set({ btResult: result }),
    reset: () => set(fullInitial),

    // ── Domain-Specific Actions ────────────────────────────────────────

    ...config.createDomainActions(set, get),
  }));

  return _store;
}

/**
 * Hook to access the DeLLMa store. Must call createDellmaStore() first.
 */
export function useStore<T = DellmaStore>(selector?: (state: DellmaStore) => T): T {
  if (!_store) {
    throw new Error("Store not initialized. Call createDellmaStore() first.");
  }
  if (selector) {
    return _store(selector);
  }
  return _store() as T;
}

// Also expose getState for non-React contexts (handlers, agents)
useStore.getState = (): DellmaStore => {
  if (!_store) {
    throw new Error("Store not initialized. Call createDellmaStore() first.");
  }
  return _store.getState();
};

useStore.subscribe = (listener: (state: DellmaStore) => void) => {
  if (!_store) {
    throw new Error("Store not initialized. Call createDellmaStore() first.");
  }
  return _store.subscribe(listener);
};
