"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { SUGGESTED_CITIES, DEFAULT_CITY_IMAGE } from "@/data/cities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { City } from "@/types";
import { CityIcon } from "@/components/city-icon";
import { Check, X } from "lucide-react";

interface CitySelectionBlockProps {
  locked: boolean;
}

export function CitySelectionBlock({ locked }: CitySelectionBlockProps) {
  const {
    selectedCities,
    addCity,
    removeCity,
    scoutReports,
  } = useStore();

  const [customCityName, setCustomCityName] = useState("");
  const [customCityCountry, setCustomCityCountry] = useState("");

  const toggleCity = (city: City) => {
    if (locked) return;
    if (selectedCities.find((c) => c.id === city.id)) {
      removeCity(city.id);
    } else {
      addCity(city);
    }
  };

  const handleAddCustomCity = () => {
    if (!customCityName.trim() || locked) return;
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

  return (
    <div className={`space-y-4 ${locked ? "opacity-60 pointer-events-none" : ""}`}>
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
                disabled={locked}
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
                disabled={locked}
              />
            </div>
            <Button
              onClick={handleAddCustomCity}
              variant="outline"
              disabled={!customCityName.trim() || locked}
            >
              + Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* City selection grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Select Destinations{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (pick 2-5)
          </span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="relative h-24 w-full">
                  <Image
                    src={city.imageUrl}
                    alt={city.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {selected && (
                    <div className="absolute top-1.5 right-1.5">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                        <Check className="w-3 h-3" />
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center gap-1.5">
                    <CityIcon icon={city.icon} className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-xs">{city.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {city.country}
                      </div>
                    </div>
                  </div>
                  {report && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                      {report.summary}
                    </p>
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
          <h3 className="text-xs font-semibold mb-2 text-muted-foreground">
            Your Custom Destinations
          </h3>
          <div className="flex gap-2 flex-wrap">
            {selectedCities
              .filter((c) => !SUGGESTED_CITIES.find((s) => s.id === c.id))
              .map((city) => (
                <Badge
                  key={city.id}
                  variant="default"
                  className={`text-xs py-0.5 px-2 ${locked ? "" : "cursor-pointer"}`}
                  onClick={() => !locked && removeCity(city.id)}
                >
                  <CityIcon icon={city.icon} className="w-3 h-3 inline-block mr-1" />
                  {city.name}, {city.country}
                  <X className="w-3 h-3 ml-1 inline-block" />
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
