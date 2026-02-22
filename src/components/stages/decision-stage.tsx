"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runBTOptimizer } from "@/lib/agents";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

const RANK_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#6b7280"];

export function DecisionStage() {
  const {
    selectedCities,
    forecasts,
    latentFactors,
    weights,
    btResult,
    setBTResult,
    // Keep legacy utilities for advocate compatibility
    setUtilities,
    setStage,
    addAgentMessage,
    setLoading,
    loading,
  } = useStore();

  const handleOptimize = async () => {
    setLoading(true);
    addAgentMessage({
      agent: "optimizer",
      message:
        "Sampling 16 states from joint forecast distribution, building overlapping microbatches of (state, action) tuples...",
      type: "thinking",
    });

    try {
      const result = await runBTOptimizer(
        selectedCities,
        latentFactors,
        forecasts,
        weights
      );
      setBTResult(result);

      // Also convert to legacy UtilityScore[] for advocate compatibility
      const legacyUtilities = result.ranking.map((r) => ({
        cityId: r.action,
        expectedUtility: r.expectedUtility,
        breakdown: { experience: 0, cost: 0, convenience: 0, novelty: 0 },
      }));
      setUtilities(legacyUtilities);

      const topAction = result.ranking[0];
      const topCityName =
        selectedCities.find((c) => c.id === topAction.action)?.name ??
        topAction.action;

      addAgentMessage({
        agent: "optimizer",
        message: `DeLLMa optimization complete! ${result.nBatches} microbatches ranked, ${result.nPairwiseComparisons} pairwise comparisons fit via Bradley-Terry. Top recommendation: ${topCityName} (EU: ${topAction.expectedUtility.toFixed(1)}).`,
        type: "success",
      });
    } catch (e) {
      addAgentMessage({
        agent: "optimizer",
        message: `Optimization failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        type: "warning",
      });
    }
    setLoading(false);
  };

  // Chart data for rankings
  const rankingChartData = btResult
    ? btResult.ranking.map((r) => {
        const city = selectedCities.find((c) => c.id === r.action);
        return {
          name: city?.name ?? r.action,
          emoji: city?.icon ?? "map-pin",
          eu: +r.expectedUtility.toFixed(1),
        };
      })
    : [];

  // Per-state utility scatter data (shows variance across states)
  const stateUtilityData = btResult
    ? selectedCities.flatMap((city) => {
        const stateUtils = btResult.perStateUtilities[city.id] || [];
        return stateUtils.map((u, stateIdx) => ({
          city: city.name,
          cityId: city.id,
          stateIndex: stateIdx,
          utility: +u.toFixed(1),
        }));
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Decision Analysis</h2>
        <p className="text-muted-foreground text-sm">
          DeLLMa-style expected utility maximization: sample states → LLM
          microbatch ranking → Bradley-Terry model → marginalize over states.
        </p>
      </div>

      {!btResult ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-4xl">🧮</p>
            <div className="text-muted-foreground space-y-2">
              <p>
                Ready to compute the optimal decision using DeLLMa&apos;s
                Bradley-Terry approach.
              </p>
              <div className="text-xs bg-muted/50 rounded-lg p-3 text-left max-w-md mx-auto space-y-1">
                <div>
                  <strong>1.</strong> Sample 16 states from the joint forecast
                  distribution
                </div>
                <div>
                  <strong>2.</strong> Cross with {selectedCities.length} actions
                  → {16 * selectedCities.length} (state, action) tuples
                </div>
                <div>
                  <strong>3.</strong> Shuffle into overlapping microbatches of 16
                </div>
                <div>
                  <strong>4.</strong> LLM ranks each microbatch using your
                  preference weights
                </div>
                <div>
                  <strong>5.</strong> Fit Bradley-Terry model via pairwise
                  comparisons
                </div>
                <div>
                  <strong>6.</strong> Marginalize U(s,a) over states → EU(a) per
                  destination
                </div>
              </div>
            </div>
            <Button onClick={handleOptimize} disabled={loading} size="lg">
              {loading ? "Optimizing (ranking microbatches)..." : "🧮 Run DeLLMa Optimizer"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {btResult.ranking.map((r, i) => {
              const city = selectedCities.find((c) => c.id === r.action);
              const stateUtils =
                btResult.perStateUtilities[r.action] || [];
              const minU = stateUtils.length
                ? Math.min(...stateUtils).toFixed(0)
                : "?";
              const maxU = stateUtils.length
                ? Math.max(...stateUtils).toFixed(0)
                : "?";
              return (
                <Card
                  key={r.action}
                  className={
                    i === 0 ? "ring-2 ring-green-500 bg-green-500/5" : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: RANK_COLORS[i] || "#6b7280" }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-xl">{city?.icon}</span>
                      <div>
                        <div className="font-semibold">{city?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {city?.country}
                        </div>
                      </div>
                      {i === 0 && (
                        <Badge className="ml-auto bg-green-600">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="text-3xl font-bold mb-2">
                      {r.expectedUtility.toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        EU
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Range across states: {minU} – {maxU}
                    </div>
                    {/* Mini utility distribution bar */}
                    {stateUtils.length > 0 && (
                      <div className="mt-2 flex gap-[1px] items-end h-8">
                        {stateUtils
                          .slice()
                          .sort((a, b) => a - b)
                          .map((u, j) => (
                            <div
                              key={j}
                              className="flex-1 rounded-t-sm"
                              style={{
                                height: `${Math.max((u / 100) * 100, 2)}%`,
                                backgroundColor:
                                  RANK_COLORS[i] || "#6b7280",
                                opacity: 0.3 + (u / 100) * 0.7,
                              }}
                              title={`State ${j}: ${u.toFixed(1)}`}
                            />
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Expected Utility Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Expected Utility (Bradley-Terry)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rankingChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip
                    formatter={(value) => [
                      Number(value).toFixed(1),
                      "Expected Utility",
                    ]}
                  />
                  <Bar
                    dataKey="eu"
                    fill="#8b5cf6"
                    name="Expected Utility"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-State Utility Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Utility Distribution Across States
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Each dot is U(state, action) for one sampled state. Spread shows
                how robust each destination is to different futures.
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="category"
                    dataKey="city"
                    allowDuplicatedCategory={false}
                    name="City"
                  />
                  <YAxis
                    type="number"
                    dataKey="utility"
                    domain={[0, 100]}
                    name="Utility"
                  />
                  <ZAxis range={[40, 40]} />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(1), "Utility"]}
                  />
                  {selectedCities.map((city, i) => {
                    const cityData = stateUtilityData.filter(
                      (d) => d.cityId === city.id
                    );
                    return (
                      <Scatter
                        key={city.id}
                        data={cityData}
                        fill={RANK_COLORS[i] || "#6b7280"}
                        name={city.name}
                        opacity={0.6}
                      />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold">16</div>
                  <div className="text-xs text-muted-foreground">
                    Sampled States
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {16 * selectedCities.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    (State, Action) Tuples
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {btResult.nBatches}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Microbatches Ranked
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {btResult.nPairwiseComparisons}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pairwise Comparisons
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStage("preferences")}
            >
              ← Back
            </Button>
            <Button
              variant="outline"
              onClick={handleOptimize}
              disabled={loading}
            >
              {loading ? "Re-optimizing..." : "🔄 Re-run Optimizer"}
            </Button>
            <Button
              onClick={() => {
                setStage("challenge");
                addAgentMessage({
                  agent: "advocate",
                  message:
                    "Time for a reality check. Let me challenge this recommendation...",
                  type: "info",
                });
              }}
            >
              Next: Devil&apos;s Advocate →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
