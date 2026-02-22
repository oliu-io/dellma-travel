// ============================================================================
// DeLLMa Framework Agent Utilities — Generic LLM calling
// ============================================================================

/**
 * Call the LLM API with a prompt and optional JSON schema for structured output.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callLLM(prompt: string, schema: Record<string, any>): Promise<any> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, schema }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `LLM call failed: ${res.status}`);
  }
  const data = await res.json();
  return data.result;
}
