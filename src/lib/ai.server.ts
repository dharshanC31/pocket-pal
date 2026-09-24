import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const MODEL = "openai/gpt-6-astra";

/** Captures and resends the gateway run id across calls in one request. */
function createRunIdFetch() {
  let runId: string | null = null;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
    const response = await fetch(input, { ...init, headers });
    const returned = response.headers.get("X-Lovable-AIG-Run-ID");
    if (returned) runId = returned;
    return response;
  };
  return wrapped;
}

/**
 * Calls Lovable AI and returns the final text. Always streams upstream
 * (reasoning models run long) but is consumed server-side.
 */
export async function askAI(system: string, prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");

  const gateway = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: createRunIdFetch(),
  });

  const result = streamText({
    model: gateway.responses(MODEL),
    system,
    prompt,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return (await result.text).trim();
}
