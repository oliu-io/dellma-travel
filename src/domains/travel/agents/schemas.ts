// JSON schemas for structured output from each agent

export const scoutSchema = {
  type: "object" as const,
  properties: {
    reports: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          cityId: { type: "string" as const, description: "Exact cityId from the prompt (e.g. 'tokyo', 'new-york')" },
          summary: { type: "string" as const, description: "2-3 sentence qualitative summary of the destination" },
          highlights: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Top 3-4 qualitative highlights or activities",
          },
          considerations: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Key concerns, risks, or things to be aware of",
          },
          bestTimeFactors: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Time-sensitive factors for the departure date",
          },
        },
        required: ["cityId", "summary", "highlights", "considerations", "bestTimeFactors"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["reports"] as const,
  additionalProperties: false,
};

export const stateEnumerationSchema = {
  type: "object" as const,
  properties: {
    factors: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, description: "snake_case identifier, unique per factor. For per-destination factors include the cityId, e.g. 'flight_cost_tokyo'" },
          name: { type: "string" as const, description: "Human-readable name, e.g. 'Flight Cost to Tokyo'" },
          description: { type: "string" as const, description: "What this factor represents and why it matters" },
          cityId: { type: "string" as const, description: "If this factor is specific to one destination, set to the exact cityId. Use empty string \"\" for truly shared factors that apply to all destinations." },
          plausibleValues: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                id: { type: "string" as const, description: "snake_case identifier" },
                label: { type: "string" as const, description: "Short human-readable label" },
                description: { type: "string" as const, description: "What this value means concretely" },
              },
              required: ["id", "label", "description"] as const,
              additionalProperties: false,
            },
          },
        },
        required: ["id", "name", "description", "cityId", "plausibleValues"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["factors"] as const,
  additionalProperties: false,
};

export const forecasterSchema = {
  type: "object" as const,
  properties: {
    forecasts: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          factorId: { type: "string" as const },
          cityId: { type: "string" as const },
          probabilities: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                valueId: { type: "string" as const },
                probability: { type: "number" as const },
              },
              required: ["valueId", "probability"] as const,
              additionalProperties: false,
            },
          },
        },
        required: ["factorId", "cityId", "probabilities"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["forecasts"] as const,
  additionalProperties: false,
};

export const optimizerSchema = {
  type: "object" as const,
  properties: {
    utilities: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          cityId: { type: "string" as const },
          expectedUtility: { type: "number" as const },
          breakdown: {
            type: "object" as const,
            properties: {
              experience: { type: "number" as const },
              cost: { type: "number" as const },
              convenience: { type: "number" as const },
              novelty: { type: "number" as const },
            },
            required: ["experience", "cost", "convenience", "novelty"] as const,
            additionalProperties: false,
          },
        },
        required: ["cityId", "expectedUtility", "breakdown"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["utilities"] as const,
  additionalProperties: false,
};

export const advocateSchema = {
  type: "object" as const,
  properties: {
    topChoiceRisks: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          risk: { type: "string" as const },
          severity: {
            type: "string" as const,
            enum: ["high", "medium", "low"],
          },
          likelihood: {
            type: "string" as const,
            enum: ["likely", "possible", "unlikely"],
          },
        },
        required: ["risk", "severity", "likelihood"] as const,
        additionalProperties: false,
      },
    },
    alternativeScenario: {
      type: "object" as const,
      properties: {
        condition: { type: "string" as const },
        betterChoice: { type: "string" as const },
        betterChoiceName: { type: "string" as const },
        explanation: { type: "string" as const },
      },
      required: ["condition", "betterChoice", "betterChoiceName", "explanation"] as const,
      additionalProperties: false,
    },
    hiddenAssumption: { type: "string" as const },
    questionForUser: { type: "string" as const },
  },
  required: [
    "topChoiceRisks",
    "alternativeScenario",
    "hiddenAssumption",
    "questionForUser",
  ] as const,
  additionalProperties: false,
};
