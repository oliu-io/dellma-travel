import type { LatentFactor } from "@/lib/dellma/types";

export const DEFAULT_LATENT_FACTORS: LatentFactor[] = [
  {
    id: "weather",
    name: "Weather Quality",
    description: "Overall weather conditions during your trip dates",
    plausibleValues: [
      { id: "weather_excellent", label: "Excellent", description: "Clear skies, ideal temperatures" },
      { id: "weather_good", label: "Good", description: "Mostly pleasant, occasional clouds" },
      { id: "weather_mixed", label: "Mixed", description: "Unpredictable, some rain expected" },
      { id: "weather_poor", label: "Poor", description: "Frequent rain or extreme temps" },
    ],
  },
  {
    id: "flight_price",
    name: "Flight Price Movement",
    description: "How flight prices change between now and departure",
    plausibleValues: [
      { id: "price_drop", label: "Drops 15%+", description: "Prices decrease significantly" },
      { id: "price_stable", label: "Stable", description: "Prices remain roughly the same" },
      { id: "price_rise_small", label: "Rises 15%", description: "Moderate price increase" },
      { id: "price_rise_large", label: "Rises 30%+", description: "Significant price spike" },
    ],
  },
  {
    id: "crowds",
    name: "Crowd Level",
    description: "Tourism density at the destination",
    plausibleValues: [
      { id: "crowds_low", label: "Low Season", description: "Few tourists, easy access everywhere" },
      { id: "crowds_moderate", label: "Moderate", description: "Manageable crowds, some waits" },
      { id: "crowds_peak", label: "Peak", description: "Very crowded, long queues, higher prices" },
    ],
  },
  {
    id: "currency",
    name: "Currency Shift",
    description: "Exchange rate movement affecting your purchasing power",
    plausibleValues: [
      { id: "fx_favorable", label: "Favorable", description: "Your currency strengthens, things feel cheaper" },
      { id: "fx_stable", label: "Stable", description: "No significant change" },
      { id: "fx_unfavorable", label: "Unfavorable", description: "Your currency weakens, things feel pricier" },
    ],
  },
  {
    id: "disruption",
    name: "Travel Disruption Risk",
    description: "Risk of flights, transport, or access being disrupted",
    plausibleValues: [
      { id: "disruption_none", label: "None", description: "Smooth travel throughout" },
      { id: "disruption_minor", label: "Minor Delays", description: "Some delays but manageable" },
      { id: "disruption_major", label: "Major Disruption", description: "Strikes, storms, or closures causing significant issues" },
    ],
  },
];
