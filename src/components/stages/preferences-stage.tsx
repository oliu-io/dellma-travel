"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { PairwiseComparison } from "@/types";

// Generate some pairwise comparisons for human judgment
function generateComparisons(
  cityIds: string[],
  cityNames: Record<string, string>,
  factors: { id: string; name: string; values: { id: string; label: string }[] }[]
): PairwiseComparison[] {
  const comparisons: PairwiseComparison[] = [];
  // Create a few interesting comparisons
  for (let i = 0; i < cityIds.length && comparisons.length < 4; i++) {
    for (let j = i + 1; j < cityIds.length && comparisons.length < 4; j++) {
      const stateA: Record<string, string> = {};
      const stateB: Record<string, string> = {};
      for (const f of factors) {
        // Give A a good scenario, B a mixed one
        stateA[f.name] = f.values[Math.min(1, f.values.length - 1)]?.label ?? "Unknown";
        stateB[f.name] = f.values[Math.min(2, f.values.length - 1)]?.label ?? "Unknown";
      }
      comparisons.push({
        id: `comp-${i}-${j}`,
        stateActionA: { cityId: cityIds[i], state: stateA },
        stateActionB: { cityId: cityIds[j], state: stateB },
        preferred: null,
        source: "human",
      });
    }
  }
  return comparisons;
}

export function PreferencesStage() {
  const {
    weights,
    setWeights,
    selectedCities,
    latentFactors,
    comparisons,
    setComparisons,
    setStage,
    addAgentMessage,
  } = useStore();

  const [localWeights, setLocalWeights] = useState(weights);

  // Generate comparisons on first render if empty
  useEffect(() => {
    if (comparisons.length === 0) {
      const cityNames: Record<string, string> = {};
      selectedCities.forEach((c) => (cityNames[c.id] = c.name));
      const factors = latentFactors.map((f) => ({
        id: f.id,
        name: f.name,
        values: f.plausibleValues.map((v) => ({ id: v.id, label: v.label })),
      }));
      const comps = generateComparisons(
        selectedCities.map((c) => c.id),
        cityNames,
        factors
      );
      setComparisons(comps);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateWeight = (
    key: keyof typeof localWeights,
    value: number
  ) => {
    const newWeights = { ...localWeights, [key]: value };
    // Normalize to sum to 1
    const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const k of Object.keys(newWeights) as (keyof typeof newWeights)[]) {
        newWeights[k] = newWeights[k] / total;
      }
    }
    setLocalWeights(newWeights);
  };

  const handleComparison = (compId: string, preferred: "A" | "B") => {
    setComparisons(
      comparisons.map((c) =>
        c.id === compId ? { ...c, preferred } : c
      )
    );
  };

  const getCityName = (cityId: string) =>
    selectedCities.find((c) => c.id === cityId)?.name ?? cityId;
  const getCityEmoji = (cityId: string) =>
    selectedCities.find((c) => c.id === cityId)?.icon ?? "map-pin";

  const handleProceed = () => {
    setWeights(localWeights);
    setStage("decision");
    addAgentMessage({
      agent: "optimizer",
      message: "Computing expected utilities with your preferences and forecasts...",
      type: "info",
    });
  };

  const weightLabels = [
    { key: "experience" as const, label: "Experience", icon: "🌟", desc: "Weather, activities, cultural richness" },
    { key: "cost" as const, label: "Cost", icon: "💰", desc: "Budget efficiency, value for money" },
    { key: "convenience" as const, label: "Convenience", icon: "✈️", desc: "Travel time, disruption risk, visa ease" },
    { key: "novelty" as const, label: "Novelty", icon: "🗺️", desc: "Uniqueness, cultural difference" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Preference Elicitation</h2>
        <p className="text-muted-foreground text-sm">
          Tell us what matters most to you.{" "}
          <strong className="text-foreground">
            Adjust weights and compare scenarios
          </strong>{" "}
          — this is where your personal priorities shape the decision.
        </p>
      </div>

      {/* Weight sliders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Priority Weights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {weightLabels.map(({ key, label, icon, desc }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="font-medium text-sm">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    — {desc}
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {(localWeights[key] * 100).toFixed(0)}%
                </Badge>
              </div>
              <Slider
                value={[localWeights[key] * 100]}
                min={5}
                max={70}
                step={1}
                onValueChange={([v]) => updateWeight(key, v / 100)}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Weights auto-normalize to sum to 100%.
          </p>
        </CardContent>
      </Card>

      {/* Pairwise comparisons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Scenario Comparisons{" "}
            <span className="text-xs font-normal text-muted-foreground">
              — Help calibrate the utility model
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comparisons.map((comp) => (
            <div
              key={comp.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start p-3 rounded-lg bg-muted/30"
            >
              {/* Scenario A */}
              <div
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  comp.preferred === "A"
                    ? "border-primary bg-primary/10"
                    : "hover:border-muted-foreground"
                }`}
                onClick={() => handleComparison(comp.id, "A")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{getCityEmoji(comp.stateActionA.cityId)}</span>
                  <span className="font-medium text-sm">
                    {getCityName(comp.stateActionA.cityId)}
                  </span>
                  {comp.preferred === "A" && (
                    <Badge className="ml-auto">Preferred</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {Object.entries(comp.stateActionA.state).map(
                    ([factor, value]) => (
                      <div
                        key={factor}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium">{factor}:</span>{" "}
                        {value}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center text-sm font-bold text-muted-foreground self-center">
                VS
              </div>

              {/* Scenario B */}
              <div
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  comp.preferred === "B"
                    ? "border-primary bg-primary/10"
                    : "hover:border-muted-foreground"
                }`}
                onClick={() => handleComparison(comp.id, "B")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{getCityEmoji(comp.stateActionB.cityId)}</span>
                  <span className="font-medium text-sm">
                    {getCityName(comp.stateActionB.cityId)}
                  </span>
                  {comp.preferred === "B" && (
                    <Badge className="ml-auto">Preferred</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {Object.entries(comp.stateActionB.state).map(
                    ([factor, value]) => (
                      <div
                        key={factor}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium">{factor}:</span>{" "}
                        {value}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStage("forecast")}>
          ← Back
        </Button>
        <Button onClick={handleProceed}>
          Next: Compute Decision →
        </Button>
      </div>
    </div>
  );
}
