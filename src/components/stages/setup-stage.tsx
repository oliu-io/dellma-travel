"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { SUGGESTED_CITIES, DEFAULT_CITY_IMAGE } from "@/data/cities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { runScoutAgent, fetchDestinationContexts } from "@/lib/agents";
import { City } from "@/types";

export function SetupStage() {
  const {
    departureCity,
    setDepartureCity,
    selectedCities,
    addCity,
    removeCity,
    tripParams,
    setTripParams,
    setStage,
    addAgentMessage,
    setLoading,
    loading,
    setScoutReports,
    scoutReports,
  } = useStore();

  const [travelStyle, setTravelStyle] = useState(tripParams.travelStyle);
  const [customCityName, setCustomCityName] = useState("");
  const [customCityCountry, setCustomCityCountry] = useState("");

  const toggleCity = (city: City) => {
    if (selectedCities.find((c) => c.id === city.id)) {
      removeCity(city.id);
    } else {
      addCity(city);
    }
  };

  const handleAddCustomCity = () => {
    if (!customCityName.trim()) return;
    const id = customCityName.toLowerCase().replace(/\s+/g, "-");
    if (selectedCities.find((c) => c.id === id)) return;
    addCity({
      id,
      name: customCityName.trim(),
      country: customCityCountry.trim() || "Unknown",
      icon: "map-pin",
      imageUrl: DEFAULT_CITY_IMAGE,
    });
    setCustomCityName("");
    setCustomCityCountry("");
  };

  const handleScout = async () => {
    if (selectedCities.length < 2 || !departureCity.trim()) return;
    setLoading(true);
    addAgentMessage({
      agent: "scout",
      message: `Fetching destination info from Wikipedia & REST Countries...`,
      type: "thinking",
    });

    try {
      // Fetch real destination context first (Wikipedia + REST Countries)
      let contexts = null;
      try {
        contexts = await fetchDestinationContexts(selectedCities);
        addAgentMessage({
          agent: "scout",
          message: `Got context for ${contexts.length} destinations. Now scouting with grounded data...`,
          type: "thinking",
        });
      } catch {
        addAgentMessage({
          agent: "scout",
          message: `Could not fetch destination context — proceeding with LLM knowledge only.`,
          type: "warning",
        });
      }

      const reports = await runScoutAgent(
        selectedCities,
        departureCity,
        tripParams.budget,
        tripParams.duration,
        travelStyle,
        tripParams.departureDate,
        contexts
      );
      const reportMap: Record<string, (typeof reports)[0]> = {};
      for (const r of reports) {
        reportMap[r.cityId] = r;
      }
      setScoutReports(reportMap);
      addAgentMessage({
        agent: "scout",
        message: `Scouting complete! Reports ready for ${reports.length} cities.`,
        type: "success",
      });
    } catch (e) {
      addAgentMessage({
        agent: "scout",
        message: `Scout failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        type: "warning",
      });
    }
    setLoading(false);
  };

  const handleProceed = () => {
    setTripParams({ ...tripParams, travelStyle });
    setStage("forecast");
    addAgentMessage({
      agent: "forecaster",
      message: "Moving to state enumeration. I'll identify the key uncertain factors...",
      type: "info",
    });
  };

  const styles = ["budget", "balanced", "luxury", "adventure", "cultural"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Trip Setup</h2>
        <p className="text-muted-foreground text-sm">
          Configure your trip and select destinations. The Scout Agent will
          analyze each option.
        </p>
      </div>

      {/* Trip params */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trip Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Departing from
              </label>
              <input
                type="text"
                placeholder="e.g. Los Angeles, CA"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={departureCity}
                onChange={(e) => setDepartureCity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Budget: ${tripParams.budget}
              </label>
              <Slider
                value={[tripParams.budget]}
                min={1000}
                max={10000}
                step={250}
                onValueChange={([v]) =>
                  setTripParams({ ...tripParams, budget: v })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Duration: {tripParams.duration} days
              </label>
              <Slider
                value={[tripParams.duration]}
                min={3}
                max={14}
                step={1}
                onValueChange={([v]) =>
                  setTripParams({ ...tripParams, duration: v })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Departure Date
              </label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={tripParams.departureDate}
                onChange={(e) =>
                  setTripParams({
                    ...tripParams,
                    departureDate: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Travel Style
            </label>
            <div className="flex gap-2 flex-wrap">
              {styles.map((s) => (
                <Badge
                  key={s}
                  variant={travelStyle === s ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => setTravelStyle(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add custom city */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Your Own Destination</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">City</label>
              <input
                type="text"
                placeholder="e.g. Lisbon"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={customCityName}
                onChange={(e) => setCustomCityName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomCity();
                }}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Country</label>
              <input
                type="text"
                placeholder="e.g. Portugal"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={customCityCountry}
                onChange={(e) => setCustomCityCountry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomCity();
                }}
              />
            </div>
            <Button
              onClick={handleAddCustomCity}
              variant="outline"
              disabled={!customCityName.trim()}
            >
              + Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* City selection grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Select Destinations{" "}
          <span className="text-sm font-normal text-muted-foreground">
            (pick 2-5)
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SUGGESTED_CITIES.map((city) => {
            const selected = !!selectedCities.find((c) => c.id === city.id);
            const report = scoutReports[city.id];
            return (
              <Card
                key={city.id}
                className={`cursor-pointer transition-all overflow-hidden ${
                  selected
                    ? "ring-2 ring-primary"
                    : "hover:ring-1 hover:ring-muted-foreground/30"
                }`}
                onClick={() => toggleCity(city)}
              >
                <div className="relative h-32 w-full">
                  <Image
                    src={city.imageUrl}
                    alt={city.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  {selected && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground">
                        ✓ Selected
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{city.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{city.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {city.country}
                      </div>
                    </div>
                  </div>
                  {report && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {report.summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Selected custom cities */}
      {selectedCities.filter(
        (c) => !SUGGESTED_CITIES.find((s) => s.id === c.id)
      ).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            Your Custom Destinations
          </h3>
          <div className="flex gap-2 flex-wrap">
            {selectedCities
              .filter((c) => !SUGGESTED_CITIES.find((s) => s.id === c.id))
              .map((city) => (
                <Badge
                  key={city.id}
                  variant="default"
                  className="cursor-pointer text-sm py-1 px-3"
                  onClick={() => removeCity(city.id)}
                >
                  {city.icon} {city.name}, {city.country} ✕
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Scout reports detail */}
      {Object.keys(scoutReports).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🔍 Scout Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCities.map((city) => {
              const report = scoutReports[city.id];
              if (!report) return null;
              return (
                <div
                  key={city.id}
                  className="space-y-2 pb-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{city.icon}</span>
                    <span className="font-semibold">{city.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {report.summary}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {report.highlights.map((h, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                  {report.considerations.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Considerations</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {report.considerations.map((c, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-yellow-500 shrink-0">⚠</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.bestTimeFactors.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ⏰ {report.bestTimeFactors.join(" • ")}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleScout}
          disabled={
            selectedCities.length < 2 || !departureCity.trim() || loading
          }
          variant="outline"
        >
          {loading ? "Scouting..." : "🔍 Run Scout Agent"}
        </Button>
        <Button
          onClick={handleProceed}
          disabled={selectedCities.length < 2 || !departureCity.trim()}
          className="ml-auto"
        >
          Next: Enumerate States →
        </Button>
      </div>
    </div>
  );
}
