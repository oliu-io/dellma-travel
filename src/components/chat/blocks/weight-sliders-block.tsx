"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkle, Coins, Plane, Map } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface WeightSlidersBlockProps {
  locked: boolean;
}

const weightLabels: { key: "experience" | "cost" | "convenience" | "novelty"; label: string; Icon: LucideIcon; desc: string }[] = [
  { key: "experience", label: "Experience", Icon: Sparkle, desc: "Weather, activities, cultural richness" },
  { key: "cost", label: "Cost", Icon: Coins, desc: "Budget efficiency, value for money" },
  { key: "convenience", label: "Convenience", Icon: Plane, desc: "Travel time, disruption risk, visa ease" },
  { key: "novelty", label: "Novelty", Icon: Map, desc: "Uniqueness, cultural difference" },
];

export function WeightSlidersBlock({ locked }: WeightSlidersBlockProps) {
  const { weights, setWeights } = useStore();
  const [localWeights, setLocalWeights] = useState(weights);

  // Sync local weights to store on change
  useEffect(() => {
    if (!locked) {
      setWeights(localWeights);
    }
  }, [localWeights, locked, setWeights]);

  const updateWeight = (key: keyof typeof localWeights, value: number) => {
    const newWeights = { ...localWeights, [key]: value };
    const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const k of Object.keys(newWeights) as (keyof typeof newWeights)[]) {
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
        {weightLabels.map(({ key, label, Icon, desc }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">— {desc}</span>
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
