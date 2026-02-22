"use client";

import { useStore } from "@/lib/store";
import { Stage } from "@/types";

const STAGES: { id: Stage; label: string; icon: string }[] = [
  { id: "setup", label: "Setup", icon: "🔍" },
  { id: "forecast", label: "Forecast", icon: "📊" },
  { id: "preferences", label: "Preferences", icon: "⚖️" },
  { id: "decision", label: "Decision", icon: "🧮" },
  { id: "challenge", label: "Challenge", icon: "😈" },
];

export function StageNav() {
  const { stage, setStage } = useStore();

  const currentIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <nav className="space-y-1">
      {STAGES.map((s, i) => {
        const isCurrent = s.id === stage;
        const isPast = i < currentIndex;
        const isFuture = i > currentIndex;

        return (
          <button
            key={s.id}
            onClick={() => {
              if (!isFuture) setStage(s.id);
            }}
            disabled={isFuture}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
              isCurrent
                ? "bg-primary text-primary-foreground font-medium"
                : isPast
                  ? "text-foreground hover:bg-muted cursor-pointer"
                  : "text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.label}</span>
            {isPast && (
              <span className="ml-auto text-xs text-green-500">✓</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
