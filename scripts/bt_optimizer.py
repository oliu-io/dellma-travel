#!/usr/bin/env python3
"""Bradley-Terry optimizer for DeLLMa expected utility maximization.

Pipeline:
1. Sample states from joint forecast distribution
2. Create (state, action) tuples
3. Accept pre-computed rankings of overlapping microbatches
4. Convert rankings → pairwise comparisons
5. Fit Bradley-Terry model via choix
6. Marginalize over states to get EU(action)

Supports two types of factors:
- Shared factors (no cityId): apply to all actions
- Per-city factors (cityId set): only relevant for the matching action

Usage:
    # Phase 1: Generate microbatches (outputs JSON with items + batches to rank)
    python3 scripts/bt_optimizer.py prepare --input <forecasts.json>

    # Phase 2: Fit BT model from rankings (outputs EU per action)
    python3 scripts/bt_optimizer.py fit --input <rankings.json>
"""

import json
import sys
import argparse
import random

import numpy as np
import choix


# ---------------------------------------------------------------------------
# Phase 1: Prepare — sample states, build microbatches
# ---------------------------------------------------------------------------

def sample_states(factors: list[dict], actions: list[str], n_samples: int = 16, seed: int = 42) -> list[dict]:
    """Sample states from the joint forecast distribution (product of marginals).

    Handles two types of factors:
    - Shared factors (no cityId): sampled once per state, apply to all actions.
    - Per-city factors (cityId set): sampled once per state using that city's
      distribution. The value only matters for the matching action, but we still
      include it in the state vector so every state is a complete assignment.

    Returns list of dicts like:
        {"weather_tokyo": "mild", "weather_boston": "cold", "flight_cost_tokyo": "cheap", ...}
    """
    rng = np.random.default_rng(seed)

    shared_factors = [f for f in factors if not f.get("cityId")]
    per_city_factors = [f for f in factors if f.get("cityId")]

    # Build marginals for shared factors (average across all cities)
    shared_marginals = []
    for factor in shared_factors:
        value_ids = [v["id"] for v in factor["plausibleValues"]]
        forecasts = factor.get("forecasts", {})
        n_cities = len(forecasts) if forecasts else 1
        avg_probs = np.zeros(len(value_ids))
        for city_id, city_probs in forecasts.items():
            for i, vid in enumerate(value_ids):
                avg_probs[i] += city_probs.get(vid, 0.0)
        if n_cities > 0:
            avg_probs /= n_cities
        if avg_probs.sum() > 0:
            avg_probs /= avg_probs.sum()
        else:
            avg_probs = np.ones(len(value_ids)) / len(value_ids)
        shared_marginals.append((factor["id"], value_ids, avg_probs))

    # Build marginals for per-city factors (use the matching city's distribution)
    per_city_marginals = []  # (factor_id, cityId, value_ids, probs)
    for factor in per_city_factors:
        city_id = factor["cityId"]
        value_ids = [v["id"] for v in factor["plausibleValues"]]
        forecasts = factor.get("forecasts", {})
        city_probs_dict = forecasts.get(city_id, {})
        probs = np.array([city_probs_dict.get(vid, 0.0) for vid in value_ids])
        if probs.sum() > 0:
            probs /= probs.sum()
        else:
            probs = np.ones(len(value_ids)) / len(value_ids)
        per_city_marginals.append((factor["id"], city_id, value_ids, probs))

    # Sample state vectors
    states = []
    for _ in range(n_samples):
        state = {}
        # Sample shared factors
        for factor_id, value_ids, probs in shared_marginals:
            idx = rng.choice(len(value_ids), p=probs)
            state[factor_id] = value_ids[idx]
        # Sample per-city factors (each independently)
        for factor_id, city_id, value_ids, probs in per_city_marginals:
            idx = rng.choice(len(value_ids), p=probs)
            state[factor_id] = value_ids[idx]
        states.append(state)

    return states


def compute_state_probability(state: dict, factors: list[dict], city_id: str) -> float:
    """Compute P(state | city) = product of P(value_i | city) for relevant factors.

    For shared factors: use the city's forecast distribution.
    For per-city factors: only include factors that match this city_id.
                          Factors for OTHER cities are ignored (probability = 1).
    """
    prob = 1.0
    for factor in factors:
        factor_city = factor.get("cityId")

        # Skip per-city factors that belong to a different city
        if factor_city and factor_city != city_id:
            continue

        value_id = state.get(factor["id"])
        if value_id is None:
            continue

        forecasts = factor.get("forecasts", {})
        city_probs = forecasts.get(city_id, {})
        p = city_probs.get(value_id, 0.0)
        # Avoid zero probabilities (use small epsilon)
        prob *= max(p, 1e-8)
    return prob


def build_items_and_batches(
    states: list[dict],
    actions: list[str],
    factors: list[dict],
    batch_size: int = 16,
    overlap: int = 4,
    seed: int = 42,
) -> dict:
    """Build (state, action) items and overlapping microbatches.

    For the state description of each item, only include factors that are
    relevant to the item's action (shared factors + per-city factors for
    that action). This keeps the LLM prompt clean and non-confusing.
    """
    rng = random.Random(seed)

    # Pre-compute which factors are relevant for each action
    shared_factor_ids = {f["id"] for f in factors if not f.get("cityId")}
    per_city_factor_ids_by_action = {}
    for action in actions:
        city_factors = {f["id"] for f in factors if f.get("cityId") == action}
        per_city_factor_ids_by_action[action] = city_factors

    # Create all (state, action) items
    items = []
    for state_idx, state in enumerate(states):
        for action in actions:
            # Build a "relevant state" that only includes factors for this action
            relevant_factor_ids = shared_factor_ids | per_city_factor_ids_by_action.get(action, set())
            relevant_state = {k: v for k, v in state.items() if k in relevant_factor_ids}

            items.append({
                "index": len(items),
                "stateIndex": state_idx,
                "state": state,           # Full state (for probability computation)
                "relevantState": relevant_state,  # Filtered state (for LLM prompt)
                "action": action,
            })

    n_items = len(items)

    # Compute P(state | city) for each state × action
    state_probs: dict[str, list[float]] = {a: [] for a in actions}
    for state in states:
        for action in actions:
            p = compute_state_probability(state, factors, action)
            state_probs[action].append(p)

    # Normalize state probs per action
    for action in actions:
        total = sum(state_probs[action])
        if total > 0:
            state_probs[action] = [p / total for p in state_probs[action]]
        else:
            n = len(state_probs[action])
            state_probs[action] = [1.0 / n] * n

    # Shuffle items for batching
    indices = list(range(n_items))
    rng.shuffle(indices)

    # Build overlapping microbatches
    batches = []
    step = batch_size - overlap
    i = 0
    while i < n_items:
        batch = indices[i : i + batch_size]
        if len(batch) < batch_size and i > 0:
            # Last batch is too small — pad with items from previous batch for overlap
            needed = batch_size - len(batch)
            prev_batch = batches[-1] if batches else indices[:needed]
            batch_set = set(batch)
            for idx in reversed(prev_batch):
                if idx not in batch_set and needed > 0:
                    batch.insert(0, idx)
                    batch_set.add(idx)
                    needed -= 1
        if len(batch) >= 2:
            batches.append(batch)
        i += step

    return {
        "items": items,
        "batches": batches,
        "factors": factors,
        "actions": actions,
        "stateProbs": state_probs,
        "nItems": n_items,
    }


def prepare(input_data: dict) -> dict:
    """Phase 1: Prepare microbatches from forecast data.

    Input:
        {
            "factors": [
                {
                    "id": "weather_tokyo",
                    "name": "Weather in Tokyo",
                    "cityId": "tokyo",   // or omitted for shared factors
                    "plausibleValues": [{"id": "mild", "label": "Mild", ...}, ...],
                    "forecasts": {"tokyo": {"mild": 0.5, "hot": 0.3, "rainy": 0.2}}
                },
                ...
            ],
            "actions": ["tokyo", "barcelona", "reykjavik"],
            "weights": {"experience": 0.3, "cost": 0.3, "convenience": 0.2, "novelty": 0.2},
            "nSamples": 16,
            "batchSize": 16,
            "overlap": 4
        }
    """
    factors = input_data["factors"]
    actions = input_data["actions"]
    n_samples = input_data.get("nSamples", 16)
    batch_size = input_data.get("batchSize", 16)
    overlap = input_data.get("overlap", 4)
    seed = input_data.get("seed", 42)

    # Sample states from joint distribution
    states = sample_states(factors, actions, n_samples, seed)

    # Build items and batches
    result = build_items_and_batches(
        states, actions, factors,
        batch_size=batch_size,
        overlap=overlap,
        seed=seed,
    )

    # Include readable descriptions for each batch (for the LLM prompt)
    # Use the relevantState (filtered) so the LLM only sees factors that matter for each action
    batch_descriptions = []
    for batch_indices in result["batches"]:
        batch_items = []
        for idx in batch_indices:
            item = result["items"][idx]
            # Use relevant state for description (only factors for this action)
            state_desc = ", ".join(
                f"{fid}: {vid}" for fid, vid in item["relevantState"].items()
            )
            batch_items.append({
                "itemIndex": idx,
                "label": f"Item {idx}",
                "action": item["action"],
                "stateDescription": state_desc,
            })
        batch_descriptions.append(batch_items)

    result["batchDescriptions"] = batch_descriptions
    result["weights"] = input_data.get("weights", {})

    return {
        "batches": result["batches"],
        "batchDescriptions": result["batchDescriptions"],
        "actions": result["actions"],
        "stateProbs": result["stateProbs"],
        "nItems": result["nItems"],
        "nStates": n_samples,
        "nActions": len(actions),
        "weights": result["weights"],
        # Map from item index → (stateIndex, action) for marginalization
        "itemMap": [
            {"stateIndex": item["stateIndex"], "action": item["action"]}
            for item in result["items"]
        ],
        # Sampled state vectors (for decision network visualization)
        "states": [dict(s) for s in states],
    }


# ---------------------------------------------------------------------------
# Phase 2: Fit — convert rankings to pairwise comparisons, fit BT, marginalize
# ---------------------------------------------------------------------------

def rankings_to_pairwise(batches: list[list[int]], rankings: list[list[int]]) -> list[tuple[int, int]]:
    """Convert microbatch rankings to pairwise comparisons.

    Args:
        batches: list of microbatch item indices, e.g. [[0, 5, 12, 3], ...]
        rankings: list of rankings (indices into the batch, best to worst)
                  e.g. [[2, 0, 3, 1], ...] meaning batch[2] > batch[0] > batch[3] > batch[1]

    Returns:
        List of (winner_item_index, loser_item_index) tuples
    """
    pairs = []
    for batch, ranking in zip(batches, rankings):
        ranked_items = [batch[r] for r in ranking]
        for i in range(len(ranked_items)):
            for j in range(i + 1, len(ranked_items)):
                pairs.append((ranked_items[i], ranked_items[j]))
    return pairs


def fit_bt_and_marginalize(input_data: dict) -> dict:
    """Phase 2: Fit BT model and compute expected utilities.

    Input:
        {
            "batches": [[0, 5, 12, ...], ...],
            "rankings": [[2, 0, 3, 1], ...],
            "stateProbs": {"tokyo": [0.1, 0.2, ...], ...},
            "nItems": 64,
            "nStates": 16,
            "nActions": 4,
            "actions": ["tokyo", "barcelona", ...],
            "itemMap": [{"stateIndex": 0, "action": "tokyo"}, ...]
        }
    """
    batches = input_data["batches"]
    rankings = input_data["rankings"]
    n_items = input_data["nItems"]
    n_states = input_data["nStates"]
    actions = input_data["actions"]
    state_probs = input_data["stateProbs"]
    item_map = input_data["itemMap"]

    # Convert rankings to pairwise comparisons
    pairs = rankings_to_pairwise(batches, rankings)

    # Fit Bradley-Terry model
    bt_params = choix.ilsr_pairwise(n_items, pairs, alpha=0.01)

    # Convert BT params to utility scale (shift so min=0, scale to 0-100)
    bt_min = bt_params.min()
    bt_max = bt_params.max()
    if bt_max > bt_min:
        utilities = (bt_params - bt_min) / (bt_max - bt_min) * 100
    else:
        utilities = np.full(n_items, 50.0)

    # Build U(state, action) matrix
    u_matrix = {}  # action -> list of utilities per state
    for idx, mapping in enumerate(item_map):
        action = mapping["action"]
        state_idx = mapping["stateIndex"]
        if action not in u_matrix:
            u_matrix[action] = [0.0] * n_states
        u_matrix[action][state_idx] = float(utilities[idx])

    # Marginalize: EU(a) = sum_s P(s|a) * U(s, a)
    expected_utilities = {}
    for action in actions:
        probs = state_probs[action]
        us = u_matrix.get(action, [0.0] * n_states)
        eu = sum(p * u for p, u in zip(probs, us))
        expected_utilities[action] = round(eu, 2)

    # Also return per-state utilities for transparency
    per_state_utilities = {}
    for action in actions:
        per_state_utilities[action] = [
            round(u, 2) for u in u_matrix.get(action, [0.0] * n_states)
        ]

    # Rank actions
    ranked = sorted(expected_utilities.items(), key=lambda x: -x[1])

    return {
        "expectedUtilities": expected_utilities,
        "ranking": [{"action": a, "expectedUtility": eu} for a, eu in ranked],
        "perStateUtilities": per_state_utilities,
        "nPairwiseComparisons": len(pairs),
        "nBatches": len(batches),
        "btParams": [round(float(p), 4) for p in bt_params],
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="DeLLMa Bradley-Terry Optimizer")
    parser.add_argument("phase", choices=["prepare", "fit"], help="Phase to run")
    parser.add_argument("--input", required=True, help="Path to input JSON file (or - for stdin)")
    args = parser.parse_args()

    if args.input == "-":
        input_data = json.load(sys.stdin)
    else:
        with open(args.input) as f:
            input_data = json.load(f)

    if args.phase == "prepare":
        result = prepare(input_data)
    elif args.phase == "fit":
        result = fit_bt_and_marginalize(input_data)
    else:
        raise ValueError(f"Unknown phase: {args.phase}")

    json.dump(result, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
