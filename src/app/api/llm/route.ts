import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, schema } = await req.json();

  const apiKey = process.env.DELLMA_ANTHROPIC_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DELLMA_ANTHROPIC_KEY not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      temperature: 0.3,
      system:
        "You are a precise analytical agent in a decision-making system.",
      messages: [{ role: "user", content: prompt }],
    };

    // Use structured output via output_config when a schema is provided
    if (schema) {
      body.output_config = {
        format: {
          type: "json_schema",
          schema,
        },
      };
    }

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
      return NextResponse.json(
        { error: `Anthropic API error: ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Check if the response was truncated (hit max_tokens)
    if (data.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "LLM response truncated (exceeded max tokens). The output was too long. Try reducing the number of cities or factors." },
        { status: 500 }
      );
    }

    const text = data.content[0].text;

    // When using structured output, the response is guaranteed valid JSON
    const result = schema ? JSON.parse(text) : text;
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to call LLM: ${e}` },
      { status: 500 }
    );
  }
}
