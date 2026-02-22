#!/usr/bin/env python3
"""Search flights using fli (Google Flights) and output JSON.

Usage:
    python3 scripts/search_flights.py <origin> <destination> <date> [--results N]

Example:
    python3 scripts/search_flights.py LAX NRT 2026-04-15 --results 3

Output: JSON array of flight options with price, duration, stops, airlines.
"""

import json
import argparse

from fli.search.flights import SearchFlights
from fli.models.google_flights.flights import (
    FlightSearchFilters,
    FlightSegment,
    PassengerInfo,
    TripType,
    SeatType,
    MaxStops,
    SortBy,
)
from fli.core.parsers import resolve_airport


def search(origin: str, destination: str, date: str, results: int = 3) -> list[dict]:
    """Search flights and return structured results."""
    try:
        origin_airport = resolve_airport(origin)
        destination_airport = resolve_airport(destination)
    except Exception as e:
        return [{"error": f"Invalid airport code: {e}"}]

    segments = [
        FlightSegment(
            departure_airport=[[origin_airport, 0]],
            arrival_airport=[[destination_airport, 0]],
            travel_date=date,
        )
    ]

    filters = FlightSearchFilters(
        trip_type=TripType.ONE_WAY,
        passenger_info=PassengerInfo(adults=1),
        flight_segments=segments,
        stops=MaxStops.ANY,
        seat_type=SeatType.ECONOMY,
        sort_by=SortBy.CHEAPEST,
    )

    try:
        searcher = SearchFlights()
        raw = searcher.search(filters, top_n=results)
    except Exception as e:
        return [{"error": str(e)}]

    if not raw:
        return []

    flights = []
    for flight in raw[:results]:
        try:
            info = {
                "price": flight.price,
                "duration_minutes": flight.duration,
                "stops": flight.stops,
                "airlines": [],
                "segments": [],
            }
            if flight.legs:
                info["airlines"] = list({
                    leg.airline.value if hasattr(leg.airline, 'value') else str(leg.airline)
                    for leg in flight.legs if leg.airline
                })
                for leg in flight.legs:
                    seg = {
                        "airline": leg.airline.value if hasattr(leg.airline, 'value') else str(leg.airline),
                        "duration_minutes": leg.duration or 0,
                    }
                    if leg.departure_airport:
                        seg["from"] = leg.departure_airport.name if hasattr(leg.departure_airport, 'name') else str(leg.departure_airport)
                    if leg.arrival_airport:
                        seg["to"] = leg.arrival_airport.name if hasattr(leg.arrival_airport, 'name') else str(leg.arrival_airport)
                    info["segments"].append(seg)
            flights.append(info)
        except Exception:
            continue

    return flights


def main():
    parser = argparse.ArgumentParser(description="Search flights (JSON output)")
    parser.add_argument("origin", help="Origin IATA code (e.g. LAX)")
    parser.add_argument("destination", help="Destination IATA code (e.g. NRT)")
    parser.add_argument("date", help="Departure date YYYY-MM-DD")
    parser.add_argument("--results", type=int, default=3, help="Number of results")
    args = parser.parse_args()

    results = search(args.origin, args.destination, args.date, args.results)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
