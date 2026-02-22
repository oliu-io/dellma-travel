"use client";

import { useStore } from "@/lib/dellma/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// Warm earthy palette: sage green, warm amber, terra cotta, soft rust, warm grey
const RANK_COLORS = ["#5a8a5e", "#c58940", "#b06340", "#9e5a4f", "#8a7d72"];

interface RankingResultsBlockProps {
  locked: boolean;
}

export function RankingResultsBlock({ locked }: RankingResultsBlockProps) {
  const { selectedCities, btResult } = useStore();

  if (!btResult) return null;

  const rankingChartData = btResult.ranking.map((r) => {
    const city = selectedCities.find((c: { id: string }) => c.id === r.action);
    return {
      name: city?.name ?? r.action,
      emoji: "",
      eu: +r.expectedUtility.toFixed(1),
    };
  });

  const stateUtilityData = selectedCities.flatMap((city: { id: string; name: string }) => {
    const stateUtils = btResult.perStateUtilities[city.id] || [];
    return stateUtils.map((u: number, stateIdx: number) => ({
      city: city.name,
      cityId: city.id,
      stateIndex: stateIdx,
      utility: +u.toFixed(1),
    }));
  });

  return (
    <div className={`space-y-4 ${locked ? "opacity-60" : ""}`}>
      {/* Rank cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {btResult.ranking.map((r, i) => {
          const city = selectedCities.find((c: { id: string }) => c.id === r.action);
          const stateUtils = btResult.perStateUtilities[r.action] || [];
          const minU = stateUtils.length ? Math.min(...stateUtils).toFixed(0) : "?";
          const maxU = stateUtils.length ? Math.max(...stateUtils).toFixed(0) : "?";
          return (
            <Card
              key={r.action}
              className={i === 0 ? "ring-2 ring-emerald-600/50 bg-emerald-50" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: RANK_COLORS[i] || "#6b7280" }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{city?.name}</div>
                    <div className="text-xs text-muted-foreground">{city?.country}</div>
                  </div>
                  {i === 0 && (
                    <Badge className="ml-auto bg-emerald-700 text-white">Recommended</Badge>
                  )}
                </div>
                <div className="text-3xl font-bold mb-2">
                  {r.expectedUtility.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">EU</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Range across states: {minU} – {maxU}
                </div>
                {stateUtils.length > 0 && (
                  <div className="mt-2 flex gap-[1px] items-end h-8">
                    {stateUtils
                      .slice()
                      .sort((a, b) => a - b)
                      .map((u, j) => (
                        <div
                          key={j}
                          className="flex-1 rounded-t-sm"
                          style={{
                            height: `${Math.max((u / 100) * 100, 2)}%`,
                            backgroundColor: RANK_COLORS[i] || "#6b7280",
                            opacity: 0.3 + (u / 100) * 0.7,
                          }}
                          title={`State ${j}: ${u.toFixed(1)}`}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expected Utility (Bradley-Terry)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rankingChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip
                formatter={(value) => [Number(value).toFixed(1), "Expected Utility"]}
              />
              <Bar dataKey="eu" fill="#b06340" name="Expected Utility" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scatter plot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Utility Distribution Across States</CardTitle>
          <p className="text-xs text-muted-foreground">
            Each dot is U(state, action) for one sampled state. Spread shows how robust each destination is.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="category" dataKey="city" allowDuplicatedCategory={false} name="City" />
              <YAxis type="number" dataKey="utility" domain={[0, 100]} name="Utility" />
              <ZAxis range={[40, 40]} />
              <Tooltip formatter={(value) => [Number(value).toFixed(1), "Utility"]} />
              {selectedCities.map((city: { id: string; name: string }, i: number) => {
                const cityData = stateUtilityData.filter((d: { cityId: string }) => d.cityId === city.id);
                return (
                  <Scatter
                    key={city.id}
                    data={cityData}
                    fill={RANK_COLORS[i] || "#6b7280"}
                    name={city.name}
                    opacity={0.6}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold">
                {btResult.perStateUtilities[selectedCities[0]?.id]?.length ?? "?"}
              </div>
              <div className="text-xs text-muted-foreground">Sampled States</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {(btResult.perStateUtilities[selectedCities[0]?.id]?.length ?? 0) * selectedCities.length}
              </div>
              <div className="text-xs text-muted-foreground">(State, Action) Tuples</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{btResult.nBatches}</div>
              <div className="text-xs text-muted-foreground">Microbatches Ranked</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{btResult.nPairwiseComparisons}</div>
              <div className="text-xs text-muted-foreground">Pairwise Comparisons</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
