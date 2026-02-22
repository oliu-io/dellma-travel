"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LatentFactor } from "@/types";
import { Globe, Plus, X, Check } from "lucide-react";
import { CityIcon } from "@/components/city-icon";

interface FactorEditorBlockProps {
  locked: boolean;
}

export function FactorEditorBlock({ locked }: FactorEditorBlockProps) {
  const {
    selectedCities,
    latentFactors,
    addLatentFactor,
    removeLatentFactor,
    addPlausibleValue,
    removePlausibleValue,
  } = useStore();

  const [addingValueFor, setAddingValueFor] = useState<string | null>(null);
  const [newValueLabel, setNewValueLabel] = useState("");
  const [newValueDesc, setNewValueDesc] = useState("");

  const [showAddFactor, setShowAddFactor] = useState(false);
  const [newFactorName, setNewFactorName] = useState("");
  const [newFactorDesc, setNewFactorDesc] = useState("");
  const [newFactorValues, setNewFactorValues] = useState<
    { label: string; description: string }[]
  >([]);
  const [newFvLabel, setNewFvLabel] = useState("");
  const [newFvDesc, setNewFvDesc] = useState("");

  if (latentFactors.length === 0) return null;

  const sharedFactors = latentFactors.filter((f) => !f.cityId);
  const factorsByCity = selectedCities
    .map((city) => ({
      city,
      factors: latentFactors.filter((f) => f.cityId === city.id),
    }))
    .filter((g) => g.factors.length > 0);

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

  const renderFactorRow = (factor: LatentFactor) => (
    <div
      key={factor.id}
      className="p-2.5 rounded-lg bg-background/60 space-y-1.5"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{factor.name}</span>
        <span className="text-xs text-muted-foreground truncate">
          — {factor.description}
        </span>
        {!locked && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs text-destructive hover:text-destructive shrink-0"
            onClick={() => removeLatentFactor(factor.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
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
            {!locked && factor.plausibleValues.length > 2 && (
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80"
                onClick={(e) => {
                  e.stopPropagation();
                  removePlausibleValue(factor.id, v.id);
                }}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {!locked && (
          <>
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
                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => handleAddValue(factor.id)}><Check className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => setAddingValueFor(null)}><X className="w-3 h-3" /></Button>
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
          </>
        )}
      </div>
    </div>
  );

  return (
    <Card className={locked ? "opacity-60 pointer-events-none" : ""}>
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
              <CityIcon icon={city.icon} className="w-4 h-4 text-muted-foreground" />
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
              <Globe className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
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
        {!locked && (
          <>
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
                            setNewFactorValues(newFactorValues.filter((_, j) => j !== i))
                          }
                        >
                          <X className="w-2.5 h-2.5 inline-block" />
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
                  onClick={() => setShowAddFactor(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Custom Factor
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
