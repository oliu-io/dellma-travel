// ============================================================================
// Travel Domain Types
// ============================================================================

export interface City {
  id: string;
  name: string;
  country: string;
  imageUrl: string;
  icon: string; // Lucide icon name (e.g. "landmark", "palmtree")
}

export interface ScoutReport {
  cityId: string;
  summary: string;
  highlights: string[];
  considerations: string[];
  bestTimeFactors: string[];
}

export interface CalibrationWeather {
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

export interface CalibrationFlight {
  city: string;
  cheapest_price: number;
  median_price: number;
  price_range: { min: number; max: number };
  options_found: number;
  cheapest_airline: string;
  cheapest_duration_minutes: number;
  cheapest_stops: number;
}

export interface CalibrationData {
  weather: Record<string, CalibrationWeather>;
  flights: Record<string, CalibrationFlight>;
  errors: string[];
}

export interface DestinationContext {
  cityId: string;
  cityName: string;
  country: string;
  wiki: {
    title: string;
    description: string;
    extract: string;
  } | null;
  countryInfo: {
    currencies: string;
    languages: string;
    timezones: string[];
    capital: string;
  } | null;
}

export type TravelStage = "setup" | "forecast" | "preferences" | "decision" | "challenge";
