"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/dellma/store";
import { getDomainConfig } from "@/lib/dellma/active-domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface WeightSlidersBlockProps {
  locked: boolean;
}

export function WeightSlidersBlock({ locked }: WeightSlidersBlockProps) {
  const { weights, setWeights } = useStore();
  const config = getDomainConfig();
  const dimensions = config.preferenceDimensions;

  const [localWeights, setLocalWeights] = useState<Record<string, number>>(weights);

  // Sync local weights to store on change
  useEffect(() => {
    if (!locked) {
      setWeights(localWeights);
    }
  }, [localWeights, locked, setWeights]);

  const updateWeight = (key: string, value: number) => {
    const newWeights = { ...localWeights, [key]: value };
    const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const k of Object.keys(newWeights)) {
        newWeights[k] = newWeights[k] / total;
      }
    }
    setLocalWeights(newWeights);
  };

  return (
    <Card className={locked ? "opacity-60 pointer-events-none" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Priority Weights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {dimensions.map(({ key, label, Icon, description }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">— {description}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {((localWeights[key] ?? 0) * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[(localWeights[key] ?? 0) * 100]}
              min={5}
              max={70}
              step={1}
              onValueChange={([v]) => updateWeight(key, v / 100)}
              disabled={locked}
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Weights auto-normalize to sum to 100%.
        </p>
      </CardContent>
    </Card>
  );
}
