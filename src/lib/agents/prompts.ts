import { City, LatentFactor, ForecastDistribution, PreferenceWeights, UtilityScore, ScoutReport, CalibrationData, DestinationContext } from "@/types";

export function buildScoutPrompt(
  cities: City[],
  departureCity: string,
  budget: number,
  duration: number,
  travelStyle: string,
  departureDate: string,
  destinationContexts?: DestinationContext[] | null,
): string {
  // Build per-city context section from Wikipedia + REST Countries
  let contextSection = "";
  if (destinationContexts && destinationContexts.length > 0) {
    const contextLines = destinationContexts.map((ctx) => {
      const parts: string[] = [];
      if (ctx.wiki) {
        parts.push(`Wikipedia: ${ctx.wiki.description}. ${ctx.wiki.extract}`);
      }
      if (ctx.countryInfo) {
        const info = ctx.countryInfo;
        parts.push(`Currency: ${info.currencies}. Languages: ${info.languages}. Timezone: ${info.timezones.join(", ")}.`);
      }
      return `### ${ctx.cityName}, ${ctx.country}\n${parts.join("\n")}`;
    });
    contextSection = `

=== DESTINATION REFERENCE DATA (from Wikipedia & REST Countries) ===
${contextLines.join("\n\n")}
=== END REFERENCE DATA ===

Use the factual reference data above to ground your reports. Do NOT fabricate statistics or demographics — rely on the provided data.`;
  }

  return `You are the Scout Agent in a decision-making system helping a traveler choose a destination.

The traveler's parameters:
- Departing from: ${departureCity}
- Budget: $${budget} total
- Trip duration: ${duration} days
- Travel style: ${travelStyle}
- Target departure date: ${departureDate}

Candidate destinations (use the exact cityId in your response):
${cities.map(c => `- ${c.name}, ${c.country} (cityId: "${c.id}")`).join("\n")}
${contextSection}

For EACH destination, provide a QUALITATIVE report using the exact cityId shown above.

IMPORTANT: Do NOT include any specific prices, costs, or numerical budget estimates. Quantitative data like flight prices and accommodation costs will be grounded by external APIs in a later stage.

1. A concise summary (2-3 sentences) covering what makes it compelling for this traveler
2. Top 3-4 highlights or activities relevant to their travel style
3. Key considerations or concerns (visa complexity, safety, language barrier, cultural norms, etc.)
4. Any time-sensitive factors for the departure date (seasonal events, weather patterns, peak/off-peak seasons)`;
}

export function buildStateEnumerationPrompt(
  cities: City[],
  departureCity: string,
  scoutReports: Record<string, ScoutReport>,
  tripParams: { budget: number; duration: number; departureDate: string; travelStyle: string },
  calibrationData?: CalibrationData | null,
): string {
  // Build real-world data section if available
  let calibrationSection = "";
  if (calibrationData) {
    const lines: string[] = [];
    for (const city of cities) {
      const parts: string[] = [];
      const w = calibrationData.weather[city.id];
      if (w) {
        parts.push(`Weather: ${w.temperature_c}°C (feels ${w.feels_like_c}°C), ${w.weather_desc}, humidity ${w.humidity}%, wind ${w.wind_kph} km/h`);
      }
      const f = calibrationData.flights[city.id];
      if (f) {
        parts.push(`Flights from ${departureCity}: cheapest $${f.cheapest_price} (${f.cheapest_airline}), median $${f.median_price}, range $${f.price_range.min}–$${f.price_range.max}`);
      }
      if (parts.length > 0) {
        lines.push(`  ${city.name} (${city.id}):\n    ${parts.join("\n    ")}`);
      }
    }
    if (lines.length > 0) {
      calibrationSection = `

=== REAL-WORLD DATA (use to inform your factor design) ===
${lines.join("\n")}

Use this data to design RELEVANT factors with REALISTIC plausible values.
For example, if flights to Boston currently cost $300–$500, the plausible values for "Flight Cost to Boston" should be centered around that range rather than generic buckets.
=== END REAL-WORLD DATA ===`;
    }
  }

  return `You are the State Enumeration Agent in a decision-making framework based on decision theory.

The traveler is choosing between these destinations, departing from ${departureCity}:
${cities.map(c => {
  const report = scoutReports[c.id];
  return `- ${c.name}, ${c.country} (cityId: "${c.id}")${report ? `: ${report.summary}` : ""}`;
}).join("\n")}

Trip: ${tripParams.duration} days, $${tripParams.budget} budget, ${tripParams.travelStyle} style, departing ${tripParams.departureDate}.
${calibrationSection}

Your task: Identify the key LATENT FACTORS (unknown variables) whose values are uncertain but will significantly affect the traveler's outcome. These are the "states of nature" in decision theory.

CRITICAL REQUIREMENT — Per-Destination vs Shared factors:
Most factors should be **per-destination** (i.e. specific to one city). For example:
- "Flight Cost to Tokyo" (cityId: "tokyo") — affects only the Tokyo action
- "Weather in Barcelona" (cityId: "barcelona") — affects only the Barcelona action
- "Crowd Levels in Reykjavik" (cityId: "reykjavik") — affects only Reykjavik

Only use a **shared** factor (cityId: "") when the factor genuinely affects ALL destinations equally — e.g. a global currency shock, a personal scheduling constraint, or a global event. For shared factors, set cityId to an empty string "".

Do NOT create a single factor like "Flight Price Differential" that compares multiple destinations — instead create separate flight cost factors for each destination.

For per-destination factors:
- Set the "cityId" field to the exact cityId shown above
- Include the destination name in the factor name for clarity (e.g. "Weather in Tokyo", not just "Weather")
- The factor id should include the cityId (e.g. "weather_tokyo", "flight_cost_barcelona")

For each factor, provide 3-5 plausible discrete values.

Think about what unknowns could meaningfully change which destination is optimal. Create per-destination factors for: weather/climate, flight costs, accommodation costs, crowd levels, and any other destination-specific uncertainty. You can also add 0-2 shared factors if genuinely relevant.

Aim for 3-4 factor TYPES (e.g. weather, flight cost, crowd levels) × ${cities.length} destinations = ${3 * cities.length}-${4 * cities.length} total factors, plus 0-2 optional shared ones.`;
}

export function buildForecasterPrompt(
  cities: City[],
  factors: LatentFactor[],
  tripParams: { budget: number; duration: number; departureDate: string },
  calibrationData?: CalibrationData | null
): string {
  let calibrationSection = "";

  if (calibrationData) {
    const weatherLines: string[] = [];
    const flightLines: string[] = [];

    for (const city of cities) {
      const w = calibrationData.weather[city.id];
      if (w) {
        weatherLines.push(
          `  ${city.name}: ${w.temperature_c}°C (feels like ${w.feels_like_c}°C), ${w.weather_desc}, humidity ${w.humidity}%, wind ${w.wind_kph} km/h, precip ${w.precipitation_mm}mm`
        );
      }
      const f = calibrationData.flights[city.id];
      if (f) {
        flightLines.push(
          `  ${city.name}: cheapest $${f.cheapest_price} (${f.cheapest_airline}, ${Math.round(f.cheapest_duration_minutes / 60)}h${f.cheapest_stops > 0 ? `, ${f.cheapest_stops} stop${f.cheapest_stops > 1 ? "s" : ""}` : " nonstop"}), median $${f.median_price}, range $${f.price_range.min}-$${f.price_range.max} (${f.options_found} options)`
        );
      }
    }

    if (weatherLines.length > 0 || flightLines.length > 0) {
      calibrationSection = `\n\n=== REAL-WORLD CALIBRATION DATA ===
Use this data to GROUND your probability estimates. These are actual current observations.

${weatherLines.length > 0 ? `**Current Weather (from wttr.in):**\n${weatherLines.join("\n")}` : ""}
${flightLines.length > 0 ? `\n**Flight Prices (from Google Flights):**\n${flightLines.join("\n")}` : ""}

IMPORTANT: For weather-related and flight-cost factors, your probability distributions should be consistent with this real data. For example, if current weather shows 35°C and humid for Bangkok, the "hot and humid" weather value should have high probability.
=== END CALIBRATION DATA ===`;
    }
  }

  // Separate per-city and shared factors
  const perCityFactors = factors.filter(f => f.cityId);
  const sharedFactors = factors.filter(f => !f.cityId);

  let factorSection = "";

  if (sharedFactors.length > 0) {
    factorSection += `\n**SHARED FACTORS** (produce forecasts for ALL cities):\n`;
    factorSection += sharedFactors.map(f => `
**${f.name}** (${f.id}): ${f.description}
  Values: ${f.plausibleValues.map(v => `${v.label} (${v.id})`).join(", ")}
`).join("\n");
  }

  if (perCityFactors.length > 0) {
    factorSection += `\n**PER-DESTINATION FACTORS** (produce forecasts ONLY for the specified city):\n`;
    factorSection += perCityFactors.map(f => {
      const cityName = cities.find(c => c.id === f.cityId)?.name ?? f.cityId;
      return `
**${f.name}** (${f.id}) — applies to: ${cityName} (${f.cityId})
  Values: ${f.plausibleValues.map(v => `${v.label} (${v.id})`).join(", ")}
`;
    }).join("\n");
  }

  return `You are the Forecaster Agent. Given destination cities and latent factors, produce probabilistic forecasts.

Trip context:
- Departure: ${tripParams.departureDate}
- Duration: ${tripParams.duration} days
- Budget: $${tripParams.budget}

Cities: ${cities.map(c => `${c.name} (${c.id})`).join(", ")}

Assign probability distributions to each factor. Probabilities for each factor MUST sum to 1.0.

IMPORTANT:
- For **shared factors**: produce one forecast entry per city (all cities get forecasts).
- For **per-destination factors**: produce ONLY ONE forecast entry — for the city specified in the factor. Do NOT produce forecasts for other cities on per-destination factors.
${factorSection}
${calibrationSection}

Consider each city's specific geography, climate, economics, and current conditions.`;
}

export function buildOptimizerPrompt(
  cities: City[],
  forecasts: ForecastDistribution[],
  factors: LatentFactor[],
  weights: PreferenceWeights
): string {
  return `You are the Optimizer Agent. Compute expected utility for each destination.

Preference weights (user-specified, normalized to sum to 1):
- Experience (weather, crowds, activities): ${weights.experience.toFixed(2)}
- Cost (budget efficiency): ${weights.cost.toFixed(2)}
- Convenience (flight time, disruption risk, visa): ${weights.convenience.toFixed(2)}
- Novelty (uniqueness, cultural difference): ${weights.novelty.toFixed(2)}

Cities: ${cities.map(c => `${c.name} (${c.id})`).join(", ")}

Latent factors and their plausible values:
${factors.map(f => `${f.name} (${f.id}): ${f.plausibleValues.map(v => `${v.label} (${v.id})`).join(", ")}`).join("\n")}

Forecast distributions (probability of each value for each city):
${JSON.stringify(forecasts, null, 2)}

For each city, compute a utility score (0-100) for each component (experience, cost, convenience, novelty) by reasoning about how the probability-weighted states affect each component.

The expectedUtility should be the weighted sum: sum(breakdown[k] * weight[k]) for each component.`;
}

export function buildAdvocatePrompt(
  utilities: UtilityScore[],
  cities: City[],
  forecasts: ForecastDistribution[],
  factors: LatentFactor[],
  weights: PreferenceWeights
): string {
  const topCity = [...utilities].sort((a, b) => b.expectedUtility - a.expectedUtility)[0];
  const cityName = cities.find(c => c.id === topCity.cityId)?.name ?? topCity.cityId;

  return `You are the Devil's Advocate Agent. The Optimizer recommends **${cityName}** with utility ${topCity.expectedUtility.toFixed(1)}.

Full rankings:
${utilities
  .sort((a, b) => b.expectedUtility - a.expectedUtility)
  .map((u, i) => {
    const c = cities.find(c => c.id === u.cityId);
    return `${i + 1}. ${c?.name} — utility ${u.expectedUtility.toFixed(1)} (exp: ${u.breakdown.experience.toFixed(0)}, cost: ${u.breakdown.cost.toFixed(0)}, conv: ${u.breakdown.convenience.toFixed(0)}, nov: ${u.breakdown.novelty.toFixed(0)})`;
  })
  .join("\n")}

User weights: experience=${weights.experience}, cost=${weights.cost}, convenience=${weights.convenience}, novelty=${weights.novelty}

Your job: challenge the recommendation. Identify:
1. The biggest risks to the top choice (which latent factors going wrong would hurt most)
2. A scenario where the #2 or #3 choice would have been better
3. What hidden assumption might be wrong
4. One thing the user should ask themselves before committing`;
}
