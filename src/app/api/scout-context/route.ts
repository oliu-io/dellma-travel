import { NextRequest, NextResponse } from "next/server";

// ── Wikipedia summary for a city ──────────────────────────────────────────
interface WikiSummary {
  title: string;
  description: string;
  extract: string;
}

async function fetchWikiSummary(cityName: string): Promise<WikiSummary | null> {
  try {
    // Wikipedia API accepts spaces or underscores in page titles
    const encoded = encodeURIComponent(cityName.replace(/\s+/g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      {
        headers: {
          "User-Agent": "DeLLMa-Travel/1.0 (hackathon prototype)",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title ?? cityName,
      description: data.description ?? "",
      extract: data.extract ?? "",
    };
  } catch {
    return null;
  }
}

// ── REST Countries for country-level data ─────────────────────────────────
interface CountryInfo {
  currencies: string; // e.g. "Japanese yen (¥)"
  languages: string; // e.g. "Japanese"
  timezones: string[]; // e.g. ["UTC+09:00"]
  capital: string; // e.g. "Tokyo"
}

async function fetchCountryInfo(
  countryName: string
): Promise<CountryInfo | null> {
  try {
    const encoded = encodeURIComponent(countryName);
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encoded}?fields=name,currencies,languages,timezones,capital`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const country = data[0];

    // Format currencies
    const currencies = country.currencies
      ? Object.values(country.currencies as Record<string, { name: string; symbol: string }>)
          .map((c) => `${c.name} (${c.symbol})`)
          .join(", ")
      : "Unknown";

    // Format languages
    const languages = country.languages
      ? Object.values(country.languages as Record<string, string>).join(", ")
      : "Unknown";

    return {
      currencies,
      languages,
      timezones: country.timezones ?? [],
      capital: country.capital?.[0] ?? "",
    };
  } catch {
    return null;
  }
}

// ── Combined destination context ──────────────────────────────────────────
export interface DestinationContext {
  cityId: string;
  cityName: string;
  country: string;
  wiki: WikiSummary | null;
  countryInfo: CountryInfo | null;
}

export async function POST(req: NextRequest) {
  try {
    const { cities }: { cities: { id: string; name: string; country: string }[] } =
      await req.json();

    // Fetch all city wikis + country info in parallel
    // Deduplicate country lookups
    const uniqueCountries = [...new Set(cities.map((c) => c.country))];
    const countryPromises = uniqueCountries.map(async (country) => {
      const info = await fetchCountryInfo(country);
      return { country, info };
    });

    const wikiPromises = cities.map(async (city) => {
      const wiki = await fetchWikiSummary(city.name);
      return { cityId: city.id, wiki };
    });

    const [wikiResults, countryResults] = await Promise.all([
      Promise.all(wikiPromises),
      Promise.all(countryPromises),
    ]);

    // Build country info map
    const countryMap: Record<string, CountryInfo | null> = {};
    for (const cr of countryResults) {
      countryMap[cr.country] = cr.info;
    }

    // Build results
    const contexts: DestinationContext[] = cities.map((city) => {
      const wikiResult = wikiResults.find((w) => w.cityId === city.id);
      return {
        cityId: city.id,
        cityName: city.name,
        country: city.country,
        wiki: wikiResult?.wiki ?? null,
        countryInfo: countryMap[city.country] ?? null,
      };
    });

    return NextResponse.json({ contexts });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch destination context: ${e}` },
      { status: 500 }
    );
  }
}
