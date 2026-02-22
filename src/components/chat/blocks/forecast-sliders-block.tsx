"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { CityIcon } from "@/components/city-icon";

interface ForecastSlidersBlockProps {
  locked: boolean;
}

export function ForecastSlidersBlock({ locked }: ForecastSlidersBlockProps) {
  const {
    selectedCities,
    latentFactors,
    forecasts,
    updateForecast,
  } = useStore();

  if (forecasts.length === 0) return null;

  const sharedFactors = latentFactors.filter((f) => !f.cityId);
  const factorsByCity = selectedCities
    .map((city) => ({
      city,
      factors: latentFactors.filter((f) => f.cityId === city.id),
    }))
    .filter((g) => g.factors.length > 0);

  const getForecast = (factorId: string, cityId: string) => {
    return forecasts.find(
      (f) => f.factorId === factorId && f.cityId === cityId
    );
  };

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
                  <CityIcon icon={city.icon} className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{city.name}</span>
                </div>
              )}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${!factor.cityId ? "pl-7" : ""}`}>
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
                          !locked && updateForecast(factor.id, city.id, val.id, v / 100)
                        }
                        disabled={locked}
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
    <div className={`space-y-4 ${locked ? "opacity-60 pointer-events-none" : ""}`}>
      {factorsByCity.map(({ city, factors: cityFactors }) => (
        <Card key={city.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CityIcon icon={city.icon} className="w-4 h-4 text-muted-foreground" />
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
      {sharedFactors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              Shared Factors
              <span className="text-xs font-normal text-muted-foreground">
                Apply to all destinations
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharedFactors.map(renderForecastFactor)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
