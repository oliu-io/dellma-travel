"use client";

import { useStore } from "@/lib/dellma/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Eye, HelpCircle } from "lucide-react";

interface AdvocateResultBlockProps {
  locked: boolean;
}

export function AdvocateResultBlock({ locked }: AdvocateResultBlockProps) {
  const { advocateResult, utilities, selectedCities } = useStore();

  if (!advocateResult) return null;

  const sortedUtilities = [...utilities].sort(
    (a, b) => b.expectedUtility - a.expectedUtility
  );
  const topCity = sortedUtilities[0];
  const topCityData = selectedCities.find((c: { id: string }) => c.id === topCity?.cityId);

  const severityColor = (s: string) => {
    switch (s) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className={`space-y-4 ${locked ? "opacity-60" : ""}`}>
      {/* Risks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Risks to {topCityData?.name ?? "Top Choice"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {advocateResult.topChoiceRisks.map((risk, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-md bg-muted/30"
            >
              <div className="flex gap-2 flex-shrink-0">
                <Badge variant={severityColor(risk.severity) as "default"}>
                  {risk.severity}
                </Badge>
                <Badge variant="outline">{risk.likelihood}</Badge>
              </div>
              <p className="text-sm">{risk.risk}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alternative scenario */}
      <Alert>
        <AlertTitle className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
          Alternative Scenario
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="font-medium">
            {advocateResult.alternativeScenario.condition}
          </p>
          <p className="text-sm">
            <strong>{advocateResult.alternativeScenario.betterChoiceName}</strong>{" "}
            would be the better choice.{" "}
            {advocateResult.alternativeScenario.explanation}
          </p>
        </AlertDescription>
      </Alert>

      {/* Hidden assumption */}
      <Alert>
        <AlertTitle className="flex items-center gap-2">
          <Eye className="w-4 h-4" strokeWidth={1.8} />
          Hidden Assumption
        </AlertTitle>
        <AlertDescription className="mt-2">
          {advocateResult.hiddenAssumption}
        </AlertDescription>
      </Alert>

      {/* Question for user */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            <div>
              <div className="font-semibold text-sm mb-1">
                Before you decide, ask yourself:
              </div>
              <p className="text-sm italic text-foreground/80">
                {advocateResult.questionForUser}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
