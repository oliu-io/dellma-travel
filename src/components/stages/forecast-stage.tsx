"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  runStateEnumeration,
  runForecasterAgent,
  fetchCalibrationData,
  CalibrationData,
} from "@/lib/agents";

export function ForecastStage() {
  const {
    selectedCities,
    departureCity,
    scoutReports,
    tripParams,
    latentFactors,
    setLatentFactors,
    addLatentFactor,
    removeLatentFactor,
    addPlausibleValue,
    removePlausibleValue,
    forecasts,
    setForecasts,
    updateForecast,
    calibrationData,
    setCalibrationData,
    setStage,
    addAgentMessage,
    setLoading,
    loading,
  } = useStore();

  // UI state for adding custom values
  const [addingValueFor, setAddingValueFor] = useState<string | null>(null);
  const [newValueLabel, setNewValueLabel] = useState("");
  const [newValueDesc, setNewValueDesc] = useState("");

  // UI state for adding custom factor
  const [showAddFactor, setShowAddFactor] = useState(false);
  const [newFactorName, setNewFactorName] = useState("");
  const [newFactorDesc, setNewFactorDesc] = useState("");
  const [newFactorValues, setNewFactorValues] = useState<
    { label: string; description: string }[]
  >([]);
  const [newFvLabel, setNewFvLabel] = useState("");
  const [newFvDesc, setNewFvDesc] = useState("");

  const [calibrating, setCalibrating] = useState(false);

  // Step 0: Fetch real-world calibration data
  const handleCalibrate = async () => {
    setCalibrating(true);
    addAgentMessage({
      agent: "forecaster",
      message:
        "Fetching real-world data: weather from wttr.in and flight prices from Google Flights...",
      type: "thinking",
    });

    try {
      const data = await fetchCalibrationData(
        selectedCities,
        departureCity,
        tripParams.departureDate
      );
      setCalibrationData(data);

      const weatherCount = Object.keys(data.weather).length;
      const flightCount = Object.keys(data.flights).length;
      addAgentMessage({
        agent: "forecaster",
        message: `Calibration complete: ${weatherCount} weather reports, ${flightCount} flight price lookups.${data.errors.length > 0 ? ` (${data.errors.length} warnings)` : ""}`,
        type: "success",
      });

      if (data.errors.length > 0) {
        for (const err of data.errors) {
          addAgentMessage({
            agent: "forecaster",
            message: `⚠️ ${err}`,
            type: "warning",
          });
        }
      }
    } catch (e) {
      addAgentMessage({
        agent: "forecaster",
        message: `Calibration failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        type: "warning",
      });
    }
    setCalibrating(false);
  };

  // Step 1: State Enumeration
  const handleEnumerate = async () => {
    setLoading(true);
    addAgentMessage({
      agent: "forecaster",
      message: calibrationData
        ? "Identifying key uncertain factors (latent states), grounded with real-world weather & flight data..."
        : "Identifying key uncertain factors (latent states) for your destinations...",
      type: "thinking",
    });

    try {
      const factors = await runStateEnumeration(
        selectedCities,
        departureCity,
        scoutReports,
        tripParams,
        calibrationData,
      );
      setLatentFactors(factors);
      addAgentMessage({
        agent: "forecaster",
        message: `Identified ${factors.length} latent factors: ${factors.map((f) => f.name).join(", ")}. Review them below, then run the forecaster.`,
        type: "success",
      });
    } catch (e) {
      addAgentMessage({
        agent: "forecaster",
        message: `State enumeration failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        type: "warning",
      });
    }
    setLoading(false);
  };

  // Step 2: Forecasting
  const handleForecast = async () => {
    setLoading(true);
    addAgentMessage({
      agent: "forecaster",
      message: `Running probabilistic forecasts across ${latentFactors.length} factors for ${selectedCities.length} cities...${calibrationData ? " (using real-world calibration data)" : ""}`,
      type: "thinking",
    });

    try {
      const result = await runForecasterAgent(
        selectedCities,
        latentFactors,
        tripParams,
        calibrationData
      );
      setForecasts(result);
      addAgentMessage({
        agent: "forecaster",
        message: `Generated ${result.length} forecast distributions. Review and adjust probabilities below.`,
        type: "success",
      });
    } catch (e) {
      addAgentMessage({
        agent: "forecaster",
        message: `Forecasting failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        type: "warning",
      });
    }
    setLoading(false);
  };

  const getForecast = (factorId: string, cityId: string) => {
    return forecasts.find(
      (f) => f.factorId === factorId && f.cityId === cityId
    );
  };

  // Add custom plausible value to a factor
  const handleAddValue = (factorId: string) => {
    if (!newValueLabel.trim()) return;
    const id = newValueLabel
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    addPlausibleValue(factorId, {
      id,
      label: newValueLabel.trim(),
      description: newValueDesc.trim() || newValueLabel.trim(),
    });
    setNewValueLabel("");
    setNewValueDesc("");
    setAddingValueFor(null);
  };

  // Add entirely new user-defined factor
  const handleAddFactor = () => {
    if (!newFactorName.trim() || newFactorValues.length < 2) return;
    const id = newFactorName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    addLatentFactor({
      id,
      name: newFactorName.trim(),
      description: newFactorDesc.trim() || newFactorName.trim(),
      plausibleValues: newFactorValues.map((v, i) => ({
        id: `${id}_v${i}`,
        label: v.label,
        description: v.description || v.label,
      })),
    });
    setNewFactorName("");
    setNewFactorDesc("");
    setNewFactorValues([]);
    setShowAddFactor(false);
  };

  // --- RENDER: No factors yet → show enumeration step ---
  if (latentFactors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">State Enumeration</h2>
          <p className="text-muted-foreground text-sm">
            First, the Forecaster Agent identifies the key{" "}
            <strong className="text-foreground">uncertain variables</strong>{" "}
            (latent states) that could affect your trip outcome.
          </p>
        </div>

        {/* Calibration Data Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📡 Ground with Real Data
              <Badge variant="outline" className="text-xs font-normal">
                Optional
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Fetch live weather and flight prices to calibrate the
              forecaster&apos;s probability estimates with real-world data.
            </p>

            {calibrationData && (
              <CalibrationDisplay data={calibrationData} />
            )}

            <Button
              onClick={handleCalibrate}
              disabled={calibrating || loading}
              variant="outline"
              size="sm"
            >
              {calibrating
                ? "Fetching real data..."
                : calibrationData
                  ? "🔄 Refresh Data"
                  : "📡 Fetch Weather & Flights"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-4xl mb-4">🔮</p>
            <p className="text-muted-foreground mb-4">
              The agent will analyze your destinations and identify what unknowns
              matter most — weather, prices, crowds, events, etc.
            </p>
            <Button onClick={handleEnumerate} disabled={loading} size="lg">
              {loading ? "Enumerating..." : "🔮 Enumerate Latent States"}
            </Button>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => setStage("setup")}>
          ← Back
        </Button>
      </div>
    );
  }

  // --- RENDER: Factors identified → show them + forecasting ---
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">State Forecasting</h2>
        <p className="text-muted-foreground text-sm">
          The LLM identified {latentFactors.length} uncertain factors.
          {forecasts.length > 0 && (
            <strong className="text-foreground">
              {" "}
              Adjust sliders to inject your domain knowledge.
            </strong>
          )}
        </p>
      </div>

      {/* Calibration Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            📡 Real-World Data
            {calibrationData && (
              <Badge variant="default" className="text-xs">
                ✓ Loaded
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {calibrationData ? (
            <CalibrationDisplay data={calibrationData} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No calibration data loaded. Forecasts will use LLM knowledge only.
            </p>
          )}
          <Button
            onClick={handleCalibrate}
            disabled={calibrating || loading}
            variant="outline"
            size="sm"
          >
            {calibrating
              ? "Fetching..."
              : calibrationData
                ? "🔄 Refresh"
                : "📡 Fetch Weather & Flights"}
          </Button>
        </CardContent>
      </Card>

      {/* Identified factors with editing controls — grouped by destination */}
      {(() => {
        const sharedFactors = latentFactors.filter((f) => !f.cityId);
        // Group per-city factors by city, maintaining city order from selectedCities
        const factorsByCity = selectedCities
          .map((city) => ({
            city,
            factors: latentFactors.filter((f) => f.cityId === city.id),
          }))
          .filter((g) => g.factors.length > 0);

        const renderFactorRow = (factor: typeof latentFactors[number]) => (
          <div
            key={factor.id}
            className="p-2.5 rounded-lg bg-background/60 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{factor.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                — {factor.description}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                onClick={() => removeLatentFactor(factor.id)}
              >
                ✕
              </Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {factor.plausibleValues.map((v) => (
                <Badge
                  key={v.id}
                  variant="outline"
                  className="text-xs group relative pr-5"
                  title={v.description}
                >
                  {v.label}
                  {factor.plausibleValues.length > 2 && (
                    <button
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-destructive text-[10px] hover:text-destructive/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlausibleValue(factor.id, v.id);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </Badge>
              ))}
              {addingValueFor === factor.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Label"
                    value={newValueLabel}
                    onChange={(e) => setNewValueLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddValue(factor.id);
                      if (e.key === "Escape") setAddingValueFor(null);
                    }}
                    className="w-24 rounded border bg-background px-2 py-0.5 text-xs"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Desc (optional)"
                    value={newValueDesc}
                    onChange={(e) => setNewValueDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddValue(factor.id);
                      if (e.key === "Escape") setAddingValueFor(null);
                    }}
                    className="w-32 rounded border bg-background px-2 py-0.5 text-xs"
                  />
                  <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => handleAddValue(factor.id)}>✓</Button>
                  <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => setAddingValueFor(null)}>✕</Button>
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer border-dashed hover:bg-muted/50"
                  onClick={() => setAddingValueFor(factor.id)}
                >
                  + Add
                </Badge>
              )}
            </div>
          </div>
        );

        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Identified Latent Factors
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {latentFactors.length} factors across {factorsByCity.length} destination{factorsByCity.length !== 1 ? "s" : ""}
                  {sharedFactors.length > 0 && ` + ${sharedFactors.length} shared`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-destination groups */}
              {factorsByCity.map(({ city, factors: cityFactors }) => (
                <div key={city.id} className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <span className="text-lg">{city.icon}</span>
                    <span className="font-semibold text-sm">{city.name}</span>
                    <span className="text-xs text-muted-foreground">{city.country}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {cityFactors.length} factor{cityFactors.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {cityFactors.map(renderFactorRow)}
                  </div>
                </div>
              ))}

              {/* Shared factors */}
              {sharedFactors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <span className="text-lg">🌐</span>
                    <span className="font-semibold text-sm">Shared Factors</span>
                    <span className="text-xs text-muted-foreground">Apply to all destinations</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {sharedFactors.length} factor{sharedFactors.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {sharedFactors.map(renderFactorRow)}
                  </div>
                </div>
              )}

              {/* Add custom factor form */}
              {showAddFactor ? (
                <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 space-y-3">
                  <div className="text-sm font-semibold">Add Custom Factor</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Factor name (e.g. Visa difficulty)"
                      value={newFactorName}
                      onChange={(e) => setNewFactorName(e.target.value)}
                      className="rounded border bg-background px-2 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newFactorDesc}
                      onChange={(e) => setNewFactorDesc(e.target.value)}
                      className="rounded border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Plausible values (need at least 2):
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {newFactorValues.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {v.label}
                          <button
                            className="ml-1 text-destructive"
                            onClick={() =>
                              setNewFactorValues(
                                newFactorValues.filter((_, j) => j !== i)
                              )
                            }
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        placeholder="Value label"
                        value={newFvLabel}
                        onChange={(e) => setNewFvLabel(e.target.value)}
                        className="w-28 rounded border bg-background px-2 py-0.5 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newFvLabel.trim()) {
                            setNewFactorValues([
                              ...newFactorValues,
                              { label: newFvLabel.trim(), description: newFvDesc.trim() || newFvLabel.trim() },
                            ]);
                            setNewFvLabel("");
                            setNewFvDesc("");
                          }
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newFvDesc}
                        onChange={(e) => setNewFvDesc(e.target.value)}
                        className="w-36 rounded border bg-background px-2 py-0.5 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newFvLabel.trim()) {
                            setNewFactorValues([
                              ...newFactorValues,
                              { label: newFvLabel.trim(), description: newFvDesc.trim() || newFvLabel.trim() },
                            ]);
                            setNewFvLabel("");
                            setNewFvDesc("");
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-xs"
                        disabled={!newFvLabel.trim()}
                        onClick={() => {
                          if (newFvLabel.trim()) {
                            setNewFactorValues([
                              ...newFactorValues,
                              { label: newFvLabel.trim(), description: newFvDesc.trim() || newFvLabel.trim() },
                            ]);
                            setNewFvLabel("");
                            setNewFvDesc("");
                          }
                        }}
                      >
                        + Add
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddFactor}
                      disabled={!newFactorName.trim() || newFactorValues.length < 2}
                    >
                      Create Factor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddFactor(false);
                        setNewFactorName("");
                        setNewFactorDesc("");
                        setNewFactorValues([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnumerate}
                    disabled={loading}
                  >
                    🔄 Re-enumerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFactor(true)}
                  >
                    ➕ Add Custom Factor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Forecasting section */}
      {forecasts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Now assign probability distributions to each factor for each city.
              {calibrationData && (
                <span className="block text-sm mt-1 text-primary font-medium">
                  ✓ Real-world data will be used to calibrate forecasts.
                </span>
              )}
            </p>
            <Button onClick={handleForecast} disabled={loading} size="lg">
              {loading ? "Forecasting..." : "📊 Run Forecaster Agent"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Group forecasts by destination, then shared */}
          {(() => {
            const sharedFcFactors = latentFactors.filter((f) => !f.cityId);
            const fcByCity = selectedCities
              .map((city) => ({
                city,
                factors: latentFactors.filter((f) => f.cityId === city.id),
              }))
              .filter((g) => g.factors.length > 0);

            const renderForecastFactor = (factor: typeof latentFactors[number]) => {
              const citiesToShow = factor.cityId
                ? selectedCities.filter((c) => c.id === factor.cityId)
                : selectedCities;
              return (
                <div key={factor.id} className="space-y-3 p-3 rounded-lg bg-muted/20">
                  <div className="font-medium text-sm">{factor.name}</div>
                  {citiesToShow.map((city) => {
                    const forecast = getForecast(factor.id, city.id);
                    if (!forecast) return null;
                    return (
                      <div key={city.id} className="space-y-2">
                        {!factor.cityId && (
                          <div className="flex items-center gap-2">
                            <span>{city.icon}</span>
                            <span className="font-medium text-sm">{city.name}</span>
                          </div>
                        )}
                        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${!factor.cityId ? "pl-7" : ""}`}>
                          {factor.plausibleValues.map((val) => {
                            const prob = forecast.probabilities[val.id] ?? 0;
                            return (
                              <div key={val.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs">{val.label}</span>
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {(prob * 100).toFixed(0)}%
                                  </Badge>
                                </div>
                                <Slider
                                  value={[prob * 100]}
                                  min={0}
                                  max={100}
                                  step={1}
                                  onValueChange={([v]) =>
                                    updateForecast(factor.id, city.id, val.id, v / 100)
                                  }
                                  className="w-full"
                                />
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div
                                    className="bg-primary rounded-full h-1.5 transition-all"
                                    style={{ width: `${prob * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            };

            return (
              <>
                {fcByCity.map(({ city, factors: cityFactors }) => (
                  <Card key={city.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-lg">{city.icon}</span>
                        {city.name}
                        <span className="text-xs font-normal text-muted-foreground">
                          {city.country}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cityFactors.map(renderForecastFactor)}
                    </CardContent>
                  </Card>
                ))}
                {sharedFcFactors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-lg">🌐</span>
                        Shared Factors
                        <span className="text-xs font-normal text-muted-foreground">
                          Apply to all destinations
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sharedFcFactors.map(renderForecastFactor)}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStage("setup")}>
          ← Back
        </Button>
        {forecasts.length > 0 && (
          <Button
            variant="outline"
            onClick={handleForecast}
            disabled={loading}
          >
            {loading ? "Re-forecasting..." : "🔄 Re-run Forecaster"}
          </Button>
        )}
        {forecasts.length > 0 && (
          <Button
            onClick={() => {
              setStage("preferences");
              addAgentMessage({
                agent: "preference",
                message:
                  "Moving to preference elicitation. Set your priority weights and review pairwise comparisons.",
                type: "info",
              });
            }}
          >
            Next: Set Preferences →
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Calibration Data Display Component ---
function CalibrationDisplay({ data }: { data: CalibrationData }) {
  const weatherEntries = Object.entries(data.weather);
  const flightEntries = Object.entries(data.flights);

  if (weatherEntries.length === 0 && flightEntries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No calibration data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {weatherEntries.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            🌤️ Current Weather
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {weatherEntries.map(([cityId, w]) => (
              <div
                key={cityId}
                className="bg-muted/40 rounded p-2 text-xs space-y-0.5"
              >
                <div className="font-medium">{w.city}</div>
                <div>
                  {w.temperature_c}°C (feels {w.feels_like_c}°C) •{" "}
                  {w.weather_desc}
                </div>
                <div className="text-muted-foreground">
                  Humidity {w.humidity}% • Wind {w.wind_kph} km/h • Precip{" "}
                  {w.precipitation_mm}mm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {flightEntries.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            ✈️ Flight Prices (Google Flights)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flightEntries.map(([cityId, f]) => (
              <div
                key={cityId}
                className="bg-muted/40 rounded p-2 text-xs space-y-0.5"
              >
                <div className="font-medium">→ {f.city}</div>
                <div>
                  <span className="font-semibold text-primary">
                    ${f.cheapest_price}
                  </span>{" "}
                  cheapest ({f.cheapest_airline},{" "}
                  {Math.round(f.cheapest_duration_minutes / 60)}h
                  {f.cheapest_stops > 0
                    ? `, ${f.cheapest_stops} stop${f.cheapest_stops > 1 ? "s" : ""}`
                    : " nonstop"}
                  )
                </div>
                <div className="text-muted-foreground">
                  Median ${f.median_price} • Range ${f.price_range.min}-$
                  {f.price_range.max} • {f.options_found} options
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
