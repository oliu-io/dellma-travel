import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

const MODEL = "claude-sonnet-4-6";

// ── Schema for ranking response ──────────────────────────────────────────
// The LLM returns a ranking as an array of item labels (e.g. ["Item 5", "Item 12", ...])
const rankingSchema = {
  type: "object" as const,
  properties: {
    ranking: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "Items ranked from MOST preferred to LEAST preferred. Use the exact item labels (e.g. 'Item 5').",
    },
  },
  required: ["ranking"] as const,
  additionalProperties: false,
};

// ── Call Anthropic API for a single ranking ────────────────────────────────
async function callLLMRanking(
  prompt: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string[]> {
  const body = {
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.2,
    system:
      systemPrompt ??
      "You are a preference evaluator in a decision-making system. You rank hypothetical scenarios by desirability given the user's stated preferences. Be consistent and thoughtful. Consider ALL preference dimensions together.",
    messages: [{ role: "user", content: prompt }],
    output_config: {
      format: {
        type: "json_schema",
        schema: rankingSchema,
      },
    },
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  const parsed = JSON.parse(text);
  return parsed.ranking;
}

// ── Build ranking prompt for a microbatch ─────────────────────────────────
function buildRankingPrompt(
  batchItems: {
    itemIndex: number;
    label: string;
    action: string;
    stateDescription: string;
  }[],
  weights: Record<string, number>,
  factorLabels: Record<string, Record<string, string>>,
  actionLabels: Record<string, string>,
  scenarioLabelPrefix?: string
): string {
  const weightDesc = Object.entries(weights)
    .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
    .join(", ");

  const prefix = scenarioLabelPrefix ?? "Travel to";

  const scenarios = batchItems
    .map((item) => {
      const actionName = actionLabels[item.action] || item.action;
      // Convert factor IDs to readable labels
      const stateEntries = item.stateDescription.split(", ").map((entry) => {
        const [factorId, valueId] = entry.split(": ");
        const label =
          factorLabels[factorId]?.[valueId] || `${factorId}=${valueId}`;
        return label;
      });
      return `**${item.label}**: ${prefix} **${actionName}** where conditions are: ${stateEntries.join("; ")}`;
    })
    .join("\n");

  return `You are evaluating scenarios for a decision-maker with these preference weights:
${weightDesc}

Below are ${batchItems.length} hypothetical scenarios. Each describes an action paired with a possible future state of the world.

Rank ALL ${batchItems.length} scenarios from MOST desirable to LEAST desirable according to the preference weights above. Consider how each state dimension interacts with the action.

Scenarios:
${scenarios}

Return the exact item labels (e.g. "Item 5") in order from best to worst. You MUST include ALL ${batchItems.length} items in your ranking.`;
}

// ── Main route ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.DELLMA_ANTHROPIC_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DELLMA_ANTHROPIC_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const input = await req.json();
    // input: { factors, actions, actionLabels, weights, nSamples, batchSize, overlap }

    const {
      factors,
      actions,
      actionLabels,
      weights,
      nSamples = 16,
      batchSize = 16,
      overlap = 4,
      systemPrompt,
      scenarioPrefix,
    } = input;

    // ── Phase 1: Prepare microbatches via Python ──────────────────────────
    const prepareInput = {
      factors,
      actions,
      weights,
      nSamples,
      batchSize,
      overlap,
    };

    const prepareInputPath = path.join(
      tmpdir(),
      `dellma_prepare_${Date.now()}.json`
    );
    await writeFile(prepareInputPath, JSON.stringify(prepareInput));

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "bt_optimizer.py"
    );
    const { stdout: prepareStdout } = await execFileAsync(
      "python3",
      [scriptPath, "prepare", "--input", prepareInputPath],
      { timeout: 30000 }
    );

    const prepared = JSON.parse(prepareStdout);
    await unlink(prepareInputPath).catch(() => {});

    // ── Build factor label maps for readable prompts ──────────────────────
    const factorLabels: Record<string, Record<string, string>> = {};
    for (const factor of factors) {
      factorLabels[factor.id] = {};
      for (const v of factor.plausibleValues) {
        factorLabels[factor.id][v.id] = `${factor.name}: ${v.label}`;
      }
    }

    // ── Phase 2: Parallel LLM ranking calls ───────────────────────────────
    const batchDescriptions = prepared.batchDescriptions;
    const batches = prepared.batches;

    const rankingPromises = batchDescriptions.map(
      (
        batchItems: {
          itemIndex: number;
          label: string;
          action: string;
          stateDescription: string;
        }[],
        batchIdx: number
      ) => {
        const prompt = buildRankingPrompt(
          batchItems,
          weights,
          factorLabels,
          actionLabels || {},
          scenarioPrefix
        );

        return callLLMRanking(prompt, apiKey, systemPrompt).then((rankedLabels) => {
          // Convert ranked labels ("Item 5", "Item 12", ...) to position indices
          // rankedLabels[0] is best, rankedLabels[last] is worst
          // We need to map to batch-internal positions

          const batchItemsByLabel = new Map<string, number>();
          for (let i = 0; i < batchItems.length; i++) {
            batchItemsByLabel.set(batchItems[i].label, i);
          }

          // ranking[k] = batch-internal position of the item ranked at position k
          // So ranking = [pos_of_best, pos_of_2nd, ..., pos_of_worst]
          const ranking: number[] = [];
          const usedPositions = new Set<number>();

          for (const label of rankedLabels) {
            const pos = batchItemsByLabel.get(label);
            if (pos !== undefined && !usedPositions.has(pos)) {
              ranking.push(pos);
              usedPositions.add(pos);
            }
          }

          // If some items were missed (LLM error), append them at the end
          for (let i = 0; i < batchItems.length; i++) {
            if (!usedPositions.has(i)) {
              ranking.push(i);
            }
          }

          return { batchIdx, ranking };
        });
      }
    );

    const rankingResults = await Promise.all(rankingPromises);

    // Sort by batch index to maintain order
    rankingResults.sort((a, b) => a.batchIdx - b.batchIdx);
    const rankings = rankingResults.map((r) => r.ranking);

    // ── Phase 3: Fit BT model via Python ──────────────────────────────────
    const fitInput = {
      batches,
      rankings,
      stateProbs: prepared.stateProbs,
      nItems: prepared.nItems,
      nStates: prepared.nStates,
      nActions: prepared.nActions,
      actions: prepared.actions,
      itemMap: prepared.itemMap,
    };

    const fitInputPath = path.join(
      tmpdir(),
      `dellma_fit_${Date.now()}.json`
    );
    await writeFile(fitInputPath, JSON.stringify(fitInput));

    const { stdout: fitStdout } = await execFileAsync(
      "python3",
      [scriptPath, "fit", "--input", fitInputPath],
      { timeout: 30000 }
    );

    const result = JSON.parse(fitStdout);
    await unlink(fitInputPath).catch(() => {});

    // Merge state data from prepare phase for decision network visualization
    result.stateProbs = prepared.stateProbs;
    result.stateDescriptions = prepared.states;

    return NextResponse.json(result);
  } catch (e) {
    console.error("Optimize error:", e);
    return NextResponse.json(
      { error: `Optimization failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
