"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { runAdvocateAgent } from "@/lib/agents";

export function ChallengeStage() {
  const {
    utilities,
    selectedCities,
    forecasts,
    latentFactors,
    weights,
    advocateResult,
    setAdvocateResult,
    setStage,
    addAgentMessage,
    setLoading,
    loading,
  } = useStore();

  const sortedUtilities = [...utilities].sort(
    (a, b) => b.expectedUtility - a.expectedUtility
  );
  const topCity = sortedUtilities[0];
  const topCityData = selectedCities.find((c) => c.id === topCity?.cityId);

  const handleChallenge = async () => {
    setLoading(true);
    addAgentMessage({
      agent: "advocate",
      message: `Challenging the recommendation for ${topCityData?.name}. Looking for risks, hidden assumptions, and alternative scenarios...`,
      type: "thinking",
    });

    try {
      const result = await runAdvocateAgent(
        utilities,
        selectedCities,
        forecasts,
        latentFactors,
        weights
      );
      setAdvocateResult(result);
      addAgentMessage({
        agent: "advocate",
        message: "Challenge complete. Review the risks and consider whether to accept or revise.",
        type: "success",
      });
    } catch {
      addAgentMessage({
        agent: "advocate",
        message: "Devil's Advocate analysis failed.",
        type: "warning",
      });
    }
    setLoading(false);
  };

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Devil's Advocate</h2>
        <p className="text-muted-foreground text-sm">
          Before you commit, let the Devil's Advocate challenge the recommendation.
          <strong className="text-foreground">
            {" "}
            This is your last checkpoint before deciding.
          </strong>
        </p>
      </div>

      {/* Current recommendation summary */}
      <Card className="ring-2 ring-green-500/50 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{topCityData?.icon}</span>
            <div>
              <div className="text-sm text-muted-foreground">
                Current Recommendation
              </div>
              <div className="text-xl font-bold">{topCityData?.name}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold">
                {topCity?.expectedUtility.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                Expected Utility
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!advocateResult ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-4xl mb-4">😈</p>
            <p className="text-muted-foreground mb-4">
              Ready to challenge the recommendation. The Devil's Advocate will
              identify risks, alternative scenarios, and hidden assumptions.
            </p>
            <Button onClick={handleChallenge} disabled={loading} size="lg">
              {loading ? "Analyzing..." : "😈 Run Devil's Advocate"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Risks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Risks to {topCityData?.name}
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
              🔄 Alternative Scenario
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="font-medium">
                {advocateResult.alternativeScenario.condition}
              </p>
              <p className="text-sm">
                <strong>
                  {advocateResult.alternativeScenario.betterChoiceName}
                </strong>{" "}
                would be the better choice.{" "}
                {advocateResult.alternativeScenario.explanation}
              </p>
            </AlertDescription>
          </Alert>

          {/* Hidden assumption */}
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              🔍 Hidden Assumption
            </AlertTitle>
            <AlertDescription className="mt-2">
              {advocateResult.hiddenAssumption}
            </AlertDescription>
          </Alert>

          {/* Question for user */}
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤔</span>
                <div>
                  <div className="font-semibold text-sm mb-1">
                    Before you decide, ask yourself:
                  </div>
                  <p className="text-sm italic">
                    {advocateResult.questionForUser}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final actions */}
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setStage("forecast")}
            >
              ← Revise Forecasts
            </Button>
            <Button
              variant="outline"
              onClick={() => setStage("preferences")}
            >
              ← Revise Preferences
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAdvocateResult(null);
                setStage("decision");
              }}
            >
              ← Re-optimize
            </Button>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              ✅ Accept: Book {topCityData?.name}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
