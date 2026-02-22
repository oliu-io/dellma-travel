// ============================================================================
// Travel Domain — Chat Action Handlers
// ============================================================================

import { useStore } from "@/lib/dellma/store";
import type { ScoutReport } from "./types";
import {
  runScoutAgent,
  fetchDestinationContexts,
  fetchCalibrationData,
  runStateEnumeration,
  runForecasterAgent,
  runBTOptimizer,
  runAdvocateAgent,
} from "./agents/runners";

// ===========================================================================
// Phase 1: Setup
// ===========================================================================

export async function handleRunScout() {
  const store = useStore.getState();
  const { selectedCities, departureCity, tripParams } = store;

  if (selectedCities.length < 2 || !departureCity.trim()) {
    store.addTextMessage("scout", "Please select at least 2 destinations and enter a departure city first.", "warning");
    return;
  }

  store.setLoading(true);
  store.addTextMessage("scout", "Fetching destination info from Wikipedia & REST Countries...", "thinking");

  try {
    // Fetch real destination context first
    let contexts = null;
    try {
      contexts = await fetchDestinationContexts(selectedCities);
      store.addTextMessage(
        "scout",
        `Got context for ${contexts.length} destinations. Now scouting with grounded data...`,
        "info"
      );
    } catch {
      store.addTextMessage(
        "scout",
        "Could not fetch destination context — proceeding with LLM knowledge only.",
        "warning"
      );
    }

    const reports = await runScoutAgent(
      selectedCities,
      departureCity,
      tripParams.budget,
      tripParams.duration,
      tripParams.travelStyle,
      tripParams.departureDate,
      contexts
    );

    const reportMap: Record<string, ScoutReport> = {};
    for (const r of reports) {
      reportMap[r.cityId] = r;
    }
    store.setScoutReports(reportMap);

    store.addTextMessage(
      "scout",
      `Scouting complete! Reports ready for ${reports.length} cities.`,
      "success"
    );

    store.addChatBlock({
      kind: "scout-reports",
      agent: "scout",
    });

    store.addChatBlock({
      kind: "action-buttons",
      agent: "system",
      buttons: [
        { label: "Proceed to Forecasting", action: "proceed-forecast", variant: "default" },
        { label: "Re-run Scout", action: "run-scout", variant: "outline" },
      ],
    });
  } catch (e) {
    store.addTextMessage(
      "scout",
      `Scout failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      "warning"
    );
  }

  store.setLoading(false);
}

export async function handleProceedForecast() {
  const store = useStore.getState();
  store.setTripParams({ ...store.tripParams }); // commit current params
  store.setStage("forecast");

  store.addChatBlock({
    kind: "stage-divider",
    agent: "system",
    title: "Forecasting",
  });

  store.addTextMessage(
    "forecaster",
    "Now let's look at the real-world picture. I'll gather current weather conditions and flight prices to ground our analysis..."
  );

  // Automatically run calibration, then enumeration
  store.setLoading(true);

  // Step 1: Calibration (mandatory)
  const { selectedCities, departureCity, tripParams } = store;
  try {
    const data = await fetchCalibrationData(selectedCities, departureCity, tripParams.departureDate);
    store.setCalibrationData(data);

    const weatherCount = Object.keys(data.weather).length;
    const flightCount = Object.keys(data.flights).length;
    store.addTextMessage(
      "forecaster",
      `Calibration data loaded: ${weatherCount} weather reports, ${flightCount} flight quotes.${data.errors.length > 0 ? ` (${data.errors.length} warnings)` : ""}`,
      "success"
    );

    store.addChatBlock({
      kind: "calibration",
      agent: "forecaster",
    });
  } catch (e) {
    store.addTextMessage(
      "forecaster",
      `Calibration failed: ${e instanceof Error ? e.message : "Unknown error"}. Proceeding with LLM knowledge only.`,
      "warning"
    );
  }

  // Step 2: Auto-run enumeration
  store.addTextMessage("forecaster", "Now identifying key uncertain factors...", "thinking");

  try {
    const freshStore = useStore.getState();
    const factors = await runStateEnumeration(
      freshStore.selectedCities,
      freshStore.departureCity,
      freshStore.scoutReports,
      freshStore.tripParams,
      freshStore.calibrationData
    );
    store.setLatentFactors(factors);

    const perCity = factors.filter((f) => f.cityId);
    const shared = factors.filter((f) => !f.cityId);
    store.addTextMessage(
      "forecaster",
      `Identified ${factors.length} latent factors: ${perCity.length} per-destination and ${shared.length} shared. Review and edit below, then run the forecaster.`,
      "success"
    );

    store.addChatBlock({
      kind: "factor-editor",
      agent: "forecaster",
    });

    store.addChatBlock({
      kind: "action-buttons",
      agent: "forecaster",
      buttons: [
        { label: "Run Forecaster", action: "run-forecast", variant: "default" },
        { label: "Re-enumerate", action: "run-enumerate", variant: "outline" },
      ],
    });
  } catch (e) {
    store.addTextMessage(
      "forecaster",
      `Enumeration failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      "warning"
    );
    store.addChatBlock({
      kind: "action-buttons",
      agent: "forecaster",
      buttons: [
        { label: "Retry Enumeration", action: "run-enumerate", variant: "default" },
      ],
    });
  }

  store.setLoading(false);
}

// ===========================================================================
// Phase 2: Forecasting
// ===========================================================================

export async function handleRunCalibrate() {
  const store = useStore.getState();
  const { selectedCities, departureCity, tripParams } = store;

  store.setLoading(true);
  store.addTextMessage("forecaster", "Fetching real-world weather and flight data...", "thinking");

  try {
    const data = await fetchCalibrationData(selectedCities, departureCity, tripParams.departureDate);
    store.setCalibrationData(data);

    const weatherCount = Object.keys(data.weather).length;
    const flightCount = Object.keys(data.flights).length;
    store.addTextMessage(
      "forecaster",
      `Calibration data loaded: ${weatherCount} weather reports, ${flightCount} flight quotes.${data.errors.length > 0 ? ` (${data.errors.length} warnings)` : ""}`,
      "success"
    );

    store.addChatBlock({
      kind: "calibration",
      agent: "forecaster",
    });

    store.addChatBlock({
      kind: "action-buttons",
      agent: "forecaster",
      buttons: [
        { label: "Enumerate Latent Factors", action: "run-enumerate", variant: "default" },
      ],
    });
  } catch (e) {
    store.addTextMessage(
      "forecaster",
      `Calibration failed: ${e instanceof Error ? e.message : "Unknown error"}. You can still proceed with enumeration.`,
      "warning"
    );
    store.addChatBlock({
      kind: "action-buttons",
      agent: "forecaster",
      buttons: [
        { label: "Enumerate Latent Factors", action: "run-enumerate", variant: "default" },
      ],
    });
  }

  store.setLoading(false);
}

export async function handleRunEnumerate() {
  const store = useStore.getState();
  const { selectedCities, departureCity, scoutReports, tripParams, calibrationData } = store;

  store.setLoading(true);
  store.addTextMessage("forecaster", "Identifying key uncertain factors that affect your decision...", "thinking");

  try {
    const factors = await runStateEnumeration(
      selectedCities,
      departureCity,
      scoutReports,
      tripParams,
      calibrationData
    );
    store.setLatentFactors(factors);

    const perCity = factors.filter((f) => f.cityId);
    const shared = factors.filter((f) => !f.cityId);
    store.addTextMessage(
      "forecaster",
      `Identified ${factors.length} latent factors: ${perCity.length} per-destination and ${shared.length} shared.`,
      "success"
    );

    store.addChatBlock({
      kind: "factor-editor",
      agent: "forecaster",
    });

    store.addChatBlock({
      kind: "action-buttons",
      agent: "forecaster",
      buttons: [
        { label: "Run Forecaster", action: "run-forecast", variant: "default" },
        { label: "Re-enumerate", action: "run-enumerate", variant: "outline" },
      ],
    });
  } catch (e) {
    store.addTextMessage(
      "forecaster",
      `Enumeration failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      "warning"
    );
  }

  store.setLoading(false);
}

export async function handleRunForecast() {
  const store = useStore.getState();
  const { selectedCities, latentFactors, tripParams, calibrationData } = store;

  store.setLoading(true);
  store.addTextMessage("forecaster", "Generating probability distributions for each factor...", "thinking");

  try {
    const forecasts = await runForecasterAgent(
      selectedCities,
      latentFactors,
      tripParams,
      calibrationData
    );
    store.setForecasts(forecasts);

    store.addTextMessage(
      "forecaster",
      `Forecasting complete! Generated ${forecasts.length} probability distributions. You can adjust these below.`,
      "success"
    );

    store.addChatBlock({
      kind: "forecast-sliders",
      agent: "forecaster",
    });

    store.addChatBlock({
      kind: "action-buttons",
      agent: "system",
      buttons: [
        { label: "Proceed to Preferences", action: "proceed-preferences", variant: "default" },
        { label: "Re-forecast", action: "run-forecast", variant: "outline" },
      ],
    });
  } catch (e) {
    store.addTextMessage(
      "forecaster",
      `Forecasting failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      "warning"
    );
  }

  store.setLoading(false);
}

// ===========================================================================
// Phase 3: Preferences, Decision, Challenge
// ===========================================================================

export function handleProceedPreferences() {
  const store = useStore.getState();
  store.setStage("preferences");

  store.addChatBlock({
    kind: "stage-divider",
    agent: "system",
    title: "Preferences",
  });

  store.addTextMessage(
    "preference",
    "Now the most human part — what matters to you? Adjust the weights below to reflect your priorities."
  );

  store.addChatBlock({
    kind: "weight-sliders",
    agent: "preference",
  });

  store.addChatBlock({
    kind: "action-buttons",
    agent: "system",
    buttons: [
      { label: "Run Optimizer", action: "run-optimizer", variant: "default" },
    ],
  });
}

export async function handleRunOptimizer() {
  const store = useStore.getState();
  const { selectedCities, latentFactors, forecasts, weights } = store;

  store.setStage("decision");
  store.setLoading(true);

  store.addChatBlock({
    kind: "stage-divider",
    agent: "system",
    title: "Decision",
  });

  store.addTextMessage(
    "optimizer",
    "Running the decision engine now — sampling possible futures, comparing scenarios, and finding the best match for your preferences...",
    "thinking"
  );

  try {
    const result = await runBTOptimizer(selectedCities, latentFactors, forecasts, weights);
    store.setBTResult(result);

    // Also set utilities for backward compat
    const utilities = result.ranking.map((r) => ({
      cityId: r.action,
      expectedUtility: r.expectedUtility,
      breakdown: {} as Record<string, number>,
    }));
    store.setUtilities(utilities);

    const topCity = selectedCities.find((c: { id: string }) => c.id === result.ranking[0]?.action);
    store.addTextMessage(
      "optimizer",
      `Optimization complete! Top recommendation: ${topCity?.name ?? result.ranking[0]?.action} (EU: ${result.ranking[0]?.expectedUtility.toFixed(1)}) based on ${result.nPairwiseComparisons} pairwise comparisons across ${result.nBatches} microbatches.`,
      "success"
    );

    store.addChatBlock({
      kind: "ranking-results",
      agent: "optimizer",
    });

    store.addChatBlock({
      kind: "decision-network",
      agent: "optimizer",
    });

    store.addChatBlock({
      kind: "action-buttons",
      agent: "system",
      buttons: [
        { label: "Run Devil's Advocate", action: "run-advocate", variant: "default" },
        { label: "Re-optimize with Different Weights", action: "proceed-preferences", variant: "outline" },
      ],
    });
  } catch (e) {
    store.addTextMessage(
      "optimizer",
      `Optimization failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      "warning"
    );
  }

  store.setLoading(false);
}

export function handleProceedChallenge() {
  const store = useStore.getState();
  store.setStage("challenge");

  store.addChatBlock({
    kind: "stage-divider",
    agent: "system",
    title: "Challenge",
  });

  store.addChatBlock({
    kind: "action-buttons",
    agent: "advocate",
    buttons: [
      { label: "Run Devil's Advocate", action: "run-advocate", variant: "default" },
    ],
  });
}

export async function handleRunAdvocate() {
  const store = useStore.getState();
  const { utilities, selectedCities, forecasts, latentFactors, weights } = store;

  store.setStage("challenge");
  store.setLoading(true);

  if (store.chatBlocks[store.chatBlocks.length - 1]?.kind !== "stage-divider" ||
      (store.chatBlocks[store.chatBlocks.length - 1] as { title?: string }).title !== "Challenge") {
    store.addChatBlock({
      kind: "stage-divider",
      agent: "system",
      title: "Challenge",
    });
  }

  store.addTextMessage(
    "advocate",
    "Before you decide — let me play devil's advocate. I'll look for hidden risks, surprising alternatives, and assumptions we might have missed...",
    "thinking"
  );

  try {
    const result = await runAdvocateAgent(utilities, selectedCities, forecasts, latentFactors, weights);
    store.setAdvocateResult(result);

    store.addTextMessage(
      "advocate",
      "Challenge analysis complete! Here's what I found:",
      "success"
    );

    store.addChatBlock({
      kind: "advocate-result",
      agent: "advocate",
    });

    store.addTextMessage(
      "system",
      "That's the full picture! You now have a recommendation, the reasoning behind it, and a healthy challenge to consider. The final call is yours — trust your instincts alongside the data.",
      "success"
    );
  } catch (e) {
    store.addTextMessage(
      "advocate",
      `Advocate analysis failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      "warning"
    );
  }

  store.setLoading(false);
}
