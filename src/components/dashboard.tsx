"use client";

import { useStore } from "@/lib/store";
import { StageNav } from "./stage-nav";
import { AgentFeed } from "./agent-feed";
import { SetupStage } from "./stages/setup-stage";
import { ForecastStage } from "./stages/forecast-stage";
import { PreferencesStage } from "./stages/preferences-stage";
import { DecisionStage } from "./stages/decision-stage";
import { ChallengeStage } from "./stages/challenge-stage";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

function StageContent() {
  const stage = useStore((s) => s.stage);

  switch (stage) {
    case "setup":
      return <SetupStage />;
    case "forecast":
      return <ForecastStage />;
    case "preferences":
      return <PreferencesStage />;
    case "decision":
      return <DecisionStage />;
    case "challenge":
      return <ChallengeStage />;
    default:
      return <SetupStage />;
  }
}

export function Dashboard() {
  const { reset, loading } = useStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✈️</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                DeLLMa Travel Advisor
              </h1>
              <p className="text-xs text-muted-foreground">
                Decision Making Under Uncertainty with Human-AI Collaboration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Agent working...
              </div>
            )}
            <Button variant="outline" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto flex gap-0 min-h-[calc(100vh-57px)]">
        {/* Left sidebar */}
        <aside className="w-52 flex-shrink-0 border-r p-4 space-y-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Stages
          </div>
          <StageNav />
          <Separator />
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agent Activity
          </div>
          <div className="h-64">
            <AgentFeed />
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 p-6 overflow-y-auto">
          <StageContent />
        </main>
      </div>
    </div>
  );
}
