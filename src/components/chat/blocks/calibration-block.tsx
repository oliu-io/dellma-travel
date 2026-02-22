"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalibrationData } from "@/types";
import { Radio, CloudSun, Plane, Check } from "lucide-react";

interface CalibrationBlockProps {
  locked: boolean;
}

export function CalibrationBlock({ locked }: CalibrationBlockProps) {
  const { calibrationData } = useStore();

  if (!calibrationData) return null;

  return (
    <Card className={locked ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="w-4 h-4 text-teal-700" strokeWidth={2} />
          Real-World Data
          <Badge variant="default" className="text-xs flex items-center gap-1">
            <Check className="w-3 h-3" />
            Loaded
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CalibrationDisplay data={calibrationData} />
      </CardContent>
    </Card>
  );
}

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
          <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
            <CloudSun className="w-3.5 h-3.5" />
            Current Weather
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {weatherEntries.map(([cityId, w]) => (
              <div
                key={cityId}
                className="bg-muted/40 rounded p-2 text-xs space-y-0.5"
              >
                <div className="font-medium">{w.city}</div>
                <div>
                  {w.temperature_c}°C (feels {w.feels_like_c}°C) ·{" "}
                  {w.weather_desc}
                </div>
                <div className="text-muted-foreground">
                  Humidity {w.humidity}% · Wind {w.wind_kph} km/h · Precip{" "}
                  {w.precipitation_mm}mm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {flightEntries.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5" />
            Flight Prices
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flightEntries.map(([cityId, f]) => (
              <div
                key={cityId}
                className="bg-muted/40 rounded p-2 text-xs space-y-0.5"
              >
                <div className="font-medium">{f.city}</div>
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
                  Median ${f.median_price} · Range ${f.price_range.min}–$
                  {f.price_range.max} · {f.options_found} options
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
