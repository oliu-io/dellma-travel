"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

const styles = ["budget", "balanced", "luxury", "adventure", "cultural"];

interface TripParamsBlockProps {
  locked: boolean;
}

export function TripParamsBlock({ locked }: TripParamsBlockProps) {
  const {
    departureCity,
    setDepartureCity,
    tripParams,
    setTripParams,
  } = useStore();

  const [travelStyle, setTravelStyle] = useState(tripParams.travelStyle);

  // Sync travel style to store when it changes
  useEffect(() => {
    if (travelStyle !== tripParams.travelStyle) {
      setTripParams({ ...tripParams, travelStyle });
    }
  }, [travelStyle]);

  return (
    <Card className={locked ? "opacity-60 pointer-events-none" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Trip Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              disabled={locked}
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
              disabled={locked}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Budget: ${tripParams.budget.toLocaleString()}
            </label>
            <Slider
              value={[tripParams.budget]}
              min={1000}
              max={10000}
              step={250}
              onValueChange={([v]) =>
                setTripParams({ ...tripParams, budget: v })
              }
              disabled={locked}
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
              disabled={locked}
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
                className={`capitalize ${locked ? "" : "cursor-pointer"}`}
                onClick={() => !locked && setTravelStyle(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
