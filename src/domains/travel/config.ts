// ============================================================================
// Travel Domain — DomainConfig Implementation
// ============================================================================

import type { DomainConfig } from "@/lib/dellma/domain-config";
import type { City, ScoutReport, CalibrationData } from "./types";
import {
  Bike,
  Compass,
  BarChart3,
  SlidersHorizontal,
  Sparkles,
  ShieldQuestion,
  Map,
  Sparkle,
  Coins,
  Plane,
} from "lucide-react";
import {
  handleRunScout,
  handleProceedForecast,
  handleRunCalibrate,
  handleRunEnumerate,
  handleRunForecast,
  handleProceedPreferences,
  handleRunOptimizer,
  handleProceedChallenge,
  handleRunAdvocate,
} from "./handlers";

// Lazy-load travel-specific block components
import { TripParamsBlock } from "./blocks/trip-params-block";
import { CitySelectionBlock } from "./blocks/city-selection-block";
import { ScoutReportsBlock } from "./blocks/scout-reports-block";
import { CalibrationBlock } from "./blocks/calibration-block";

export const travelConfig: DomainConfig = {
  id: "travel",
  name: "DeLLMa Travel",
  subtitle: "Human-AI collaborative decision making",
  HeaderIcon: Bike,

  // ── Pipeline Stages ─────────────────────────────────────────────────────
  stages: [
    { key: "setup", label: "Setup", Icon: Map },
    { key: "forecast", label: "Forecast", Icon: BarChart3 },
    { key: "preferences", label: "Preferences", Icon: SlidersHorizontal },
    { key: "decision", label: "Decision", Icon: Sparkles },
    { key: "challenge", label: "Challenge", Icon: ShieldQuestion },
  ],

  // ── Agent Metadata ──────────────────────────────────────────────────────
  agentMeta: {
    scout:      { Icon: Compass,          label: "Scout",      color: "text-amber-700",   bgColor: "bg-amber-100" },
    forecaster: { Icon: BarChart3,         label: "Forecaster", color: "text-teal-700",    bgColor: "bg-teal-100" },
    preference: { Icon: SlidersHorizontal, label: "Preference", color: "text-orange-700",  bgColor: "bg-orange-100" },
    optimizer:  { Icon: Sparkles,          label: "Optimizer",  color: "text-emerald-700", bgColor: "bg-emerald-100" },
    advocate:   { Icon: ShieldQuestion,    label: "Advocate",   color: "text-rose-700",    bgColor: "bg-rose-100" },
    system:     { Icon: Bike,              label: "DeLLMa",     color: "text-stone-600",   bgColor: "bg-stone-100" },
  },

  // ── Preference Dimensions ──────────────────────────────────────────────
  preferenceDimensions: [
    { key: "experience",  label: "Experience",  Icon: Sparkle, description: "Weather, activities, cultural richness" },
    { key: "cost",        label: "Cost",        Icon: Coins,   description: "Budget efficiency, value for money" },
    { key: "convenience", label: "Convenience", Icon: Plane,   description: "Travel time, disruption risk, visa ease" },
    { key: "novelty",     label: "Novelty",     Icon: Map,     description: "Uniqueness, cultural difference" },
  ],

  defaultWeights: {
    experience: 0.35,
    cost: 0.25,
    convenience: 0.2,
    novelty: 0.2,
  },

  // ── Action Label ────────────────────────────────────────────────────────
  actionLabel: { singular: "destination", plural: "destinations" },

  // ── Chat Flow ───────────────────────────────────────────────────────────
  seedChat: () => [
    {
      kind: "stage-divider" as const,
      agent: "system" as const,
      title: "Trip Setup",
    },
    {
      kind: "text" as const,
      agent: "system" as const,
      text: "Welcome! Let's find your ideal travel destination together. I'll guide you through a structured decision process — we'll explore options, understand uncertainties, and find what truly fits your preferences. Start by setting your trip details below.",
      tone: "info" as const,
    },
    {
      kind: "trip-params" as const,
      agent: "system" as const,
    },
    {
      kind: "city-selection" as const,
      agent: "system" as const,
    },
    {
      kind: "action-buttons" as const,
      agent: "scout" as const,
      buttons: [
        { label: "Run Scout Agent", action: "run-scout", variant: "default" as const },
      ],
    },
  ],

  actionHandlers: {
    "run-scout": handleRunScout,
    "proceed-forecast": handleProceedForecast,
    "run-calibrate": handleRunCalibrate,
    "run-enumerate": handleRunEnumerate,
    "run-forecast": handleRunForecast,
    "proceed-preferences": handleProceedPreferences,
    "run-optimizer": handleRunOptimizer,
    "proceed-challenge": handleProceedChallenge,
    "run-advocate": handleRunAdvocate,
  },

  // ── Block Registry ──────────────────────────────────────────────────────
  blockRegistry: {
    "trip-params": TripParamsBlock,
    "city-selection": CitySelectionBlock,
    "scout-reports": ScoutReportsBlock,
    "calibration": CalibrationBlock,
  },

  // ── Ranking Prompts ─────────────────────────────────────────────────────
  buildRankingSystemPrompt: () =>
    "You are a preference evaluator in a decision-making system. You rank hypothetical travel scenarios by overall desirability to a traveler.",

  buildRankingScenarioLabel: (actionLabel: string) => `Travel to ${actionLabel}`,

  // ── Domain Store Extension ──────────────────────────────────────────────
  initialDomainState: {
    departureCity: "",
    selectedCities: [] as City[],
    tripParams: {
      budget: 3000,
      duration: 5,
      departureDate: "2026-04-15",
      travelStyle: "balanced",
    },
    scoutReports: {} as Record<string, ScoutReport>,
    calibrationData: null as CalibrationData | null,
  },

  createDomainActions: (set, get) => ({
    setDepartureCity: (city: string) => set({ departureCity: city }),
    setSelectedCities: (cities: City[]) => set({ selectedCities: cities }),
    addCity: (city: City) =>
      set((state: { selectedCities: City[] }) => ({
        selectedCities: state.selectedCities.some((c) => c.id === city.id)
          ? state.selectedCities
          : [...state.selectedCities, city],
      })),
    removeCity: (cityId: string) =>
      set((state: { selectedCities: City[] }) => ({
        selectedCities: state.selectedCities.filter((c) => c.id !== cityId),
      })),
    setTripParams: (params: { budget: number; duration: number; departureDate: string; travelStyle: string }) =>
      set({ tripParams: params }),
    setScoutReports: (reports: Record<string, ScoutReport>) =>
      set({ scoutReports: reports }),
    setCalibrationData: (data: CalibrationData | null) =>
      set({ calibrationData: data }),
  }),
};
