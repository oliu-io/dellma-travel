"use client";

import { useState } from "react";
import { useStore } from "@/lib/dellma/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, ChevronDown, ChevronRight, AlertTriangle, Clock } from "lucide-react";

interface ScoutReportsBlockProps {
  locked: boolean;
}

export function ScoutReportsBlock({ locked }: ScoutReportsBlockProps) {
  const { selectedCities, scoutReports } = useStore();
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  if (Object.keys(scoutReports).length === 0) {
    return null;
  }

  const toggleCity = (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
  };

  return (
    <Card className={locked ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-700" strokeWidth={2} />
          Scout Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {selectedCities.map((city: { id: string; name: string }) => {
          const report = scoutReports[city.id];
          if (!report) return null;
          const isExpanded = expandedCities.has(city.id);
          return (
            <div
              key={city.id}
              className="rounded-lg border bg-background/50 overflow-hidden"
            >
              {/* Collapsible header */}
              <button
                type="button"
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => toggleCity(city.id)}
              >
                <span className="font-semibold text-sm">{city.name}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  — {report.summary.slice(0, 80)}{report.summary.length > 80 ? "..." : ""}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <p className="text-sm text-muted-foreground pt-2">
                    {report.summary}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {report.highlights.map((h: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                  {report.considerations.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Considerations
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {report.considerations.map((c: string, i: number) => (
                          <li key={i} className="flex gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.bestTimeFactors.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {report.bestTimeFactors.join(" · ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
