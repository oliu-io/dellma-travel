import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

// City name → IATA airport code(s) mapping
// Used by flightclaw to search Google Flights
const CITY_AIRPORT_MAP: Record<string, string> = {
  tokyo: "NRT",
  paris: "CDG",
  "new-york": "JFK",
  bangkok: "BKK",
  barcelona: "BCN",
  "mexico-city": "MEX",
  marrakech: "RAK",
  reykjavik: "KEF",
  // Fallbacks for common names
  london: "LHR",
  rome: "FCO",
  berlin: "BER",
  lisbon: "LIS",
  amsterdam: "AMS",
  singapore: "SIN",
  seoul: "ICN",
  dubai: "DXB",
  sydney: "SYD",
  "buenos-aires": "EZE",
  cairo: "CAI",
  istanbul: "IST",
  "ho-chi-minh": "SGN",
  hanoi: "HAN",
  osaka: "KIX",
  bali: "DPS",
  "kuala-lumpur": "KUL",
  mumbai: "BOM",
  "cape-town": "CPT",
  nairobi: "NBO",
  lima: "LIM",
  bogota: "BOG",
  toronto: "YYZ",
  vancouver: "YVR",
  "san-francisco": "SFO",
  "los-angeles": "LAX",
  chicago: "ORD",
  miami: "MIA",
  honolulu: "HNL",
  denver: "DEN",
  seattle: "SEA",
  atlanta: "ATL",
};

// Try to guess IATA code from city name
function guessAirportCode(cityId: string): string | null {
  // Direct match
  if (CITY_AIRPORT_MAP[cityId]) return CITY_AIRPORT_MAP[cityId];

  // Try lowercase
  const lower = cityId.toLowerCase().replace(/\s+/g, "-");
  if (CITY_AIRPORT_MAP[lower]) return CITY_AIRPORT_MAP[lower];

  // If the cityId itself looks like an IATA code (3 letters uppercase)
  if (/^[A-Z]{3}$/.test(cityId)) return cityId;

  return null;
}

// Also try to resolve departure city text to an airport code
function guessDepartureAirport(departureCityText: string): string | null {
  const normalized = departureCityText.toLowerCase().replace(/[,\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // Try common patterns like "los-angeles-ca" -> "los-angeles"
  for (const [key, code] of Object.entries(CITY_AIRPORT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return code;
    }
  }
  // Try 3-letter codes in the text
  const match = departureCityText.match(/\b([A-Z]{3})\b/);
  if (match) return match[1];
  return null;
}

interface WeatherData {
  city: string;
  temperature_c: number;
  feels_like_c: number;
  humidity: number;
  weather_desc: string;
  precipitation_mm: number;
  wind_kph: number;
  forecast_avg_temp_c?: number;
  forecast_desc?: string;
}

interface FlightData {
  city: string;
  cheapest_price: number;
  median_price: number;
  price_range: { min: number; max: number };
  options_found: number;
  cheapest_airline: string;
  cheapest_duration_minutes: number;
  cheapest_stops: number;
}

interface CalibrationResult {
  weather: Record<string, WeatherData>;
  flights: Record<string, FlightData>;
  errors: string[];
}

// Fetch weather data using wttr.in (per weather-fetcher skill)
async function fetchWeather(cityName: string): Promise<WeatherData | null> {
  try {
    const url = `https://wttr.in/${encodeURIComponent(cityName)}?format=j1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "curl/7.68.0" }, // wttr.in prefers curl-like UA
    });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;

    // Also get forecast for departure date if available
    const forecast = data.weather?.[0]; // Today's or first available day

    return {
      city: cityName,
      temperature_c: parseFloat(current.temp_C),
      feels_like_c: parseFloat(current.FeelsLikeC),
      humidity: parseInt(current.humidity),
      weather_desc: current.weatherDesc?.[0]?.value || "Unknown",
      precipitation_mm: parseFloat(current.precipMM || "0"),
      wind_kph: parseFloat(current.windspeedKmph || "0"),
      forecast_avg_temp_c: forecast ? parseFloat(forecast.avgtempC) : undefined,
      forecast_desc: forecast?.hourly?.[4]?.weatherDesc?.[0]?.value,
    };
  } catch {
    return null;
  }
}

// Fetch flight prices using fli Python script (per flightclaw skill)
async function fetchFlights(
  originCode: string,
  destCode: string,
  date: string,
): Promise<FlightData | null> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "search_flights.py");
    const { stdout } = await execFileAsync("python3", [
      scriptPath,
      originCode,
      destCode,
      date,
      "--results",
      "5",
    ], { timeout: 30000 });

    const flights = JSON.parse(stdout);
    if (!flights.length || flights[0].error) return null;

    const prices = flights.map((f: { price: number }) => f.price).sort((a: number, b: number) => a - b);
    const cheapest = flights[0];

    return {
      city: destCode,
      cheapest_price: prices[0],
      median_price: prices[Math.floor(prices.length / 2)],
      price_range: { min: prices[0], max: prices[prices.length - 1] },
      options_found: flights.length,
      cheapest_airline: cheapest.airlines?.[0] || "Unknown",
      cheapest_duration_minutes: cheapest.duration_minutes || 0,
      cheapest_stops: cheapest.stops ?? 0,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      cities,
      departureCity,
      departureDate,
    }: {
      cities: { id: string; name: string; country: string }[];
      departureCity: string;
      departureDate: string;
    } = await req.json();

    const errors: string[] = [];

    // Resolve departure airport
    const departureAirport = guessDepartureAirport(departureCity);
    if (!departureAirport) {
      errors.push(`Could not determine airport code for departure city: "${departureCity}". Flight data unavailable.`);
    }

    // Fetch weather for all cities in parallel (per weather-fetcher skill)
    const weatherPromises = cities.map(async (city) => {
      const w = await fetchWeather(`${city.name}, ${city.country}`);
      return { cityId: city.id, data: w };
    });

    // Fetch flights for all cities in parallel (per flightclaw skill)
    const flightPromises = cities.map(async (city) => {
      if (!departureAirport) return { cityId: city.id, data: null };
      const destCode = guessAirportCode(city.id) || guessAirportCode(city.name.toLowerCase().replace(/\s+/g, "-"));
      if (!destCode) {
        errors.push(`No airport code for ${city.name} — skipping flight search.`);
        return { cityId: city.id, data: null };
      }
      const f = await fetchFlights(departureAirport, destCode, departureDate);
      return { cityId: city.id, data: f };
    });

    const [weatherResults, flightResults] = await Promise.all([
      Promise.all(weatherPromises),
      Promise.all(flightPromises),
    ]);

    const result: CalibrationResult = {
      weather: {},
      flights: {},
      errors,
    };

    for (const w of weatherResults) {
      if (w.data) result.weather[w.cityId] = w.data;
    }
    for (const f of flightResults) {
      if (f.data) result.flights[f.cityId] = f.data;
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `Calibration failed: ${e}` },
      { status: 500 },
    );
  }
}
