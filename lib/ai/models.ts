import Anthropic from "@anthropic-ai/sdk";

/**
 * Model tiering.
 *
 * Everything a student sees in the ordinary course of a session — hints, Lens
 * content, ask boxes, rubric grading — runs on the cheap, fast tier.
 *
 * Distress classification is the one place accuracy outranks cost, so it runs
 * on the strongest general-purpose tier regardless of price. Opus 5 rather than
 * Fable 5 deliberately: Fable is tuned for long-running agents, is the slowest
 * of the lineup, and sits in the student's latency path here for double the
 * cost. If that tradeoff ever changes, this constant is the only edit.
 */
export const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL_DEFAULT ?? "claude-haiku-4-5";
export const MODEL_DISTRESS = process.env.ANTHROPIC_MODEL_DISTRESS ?? "claude-opus-5";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function complete(options: {
  model: string;
  prompt: string;
  maxTokens: number;
  timeoutMs?: number;
  /** Optional system turn. Ask-box lookups use this so the default model
   *  cannot counsel on the student's literal text. Distress classification
   *  must not pass one — that route is a different call with its own prompt. */
  system?: string;
}): Promise<string> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create(
    {
      model: options.model,
      max_tokens: options.maxTokens,
      ...(options.system ? { system: options.system } : {}),
      messages: [{ role: "user", content: options.prompt }],
    },
    { timeout: options.timeoutMs ?? 30_000 },
  );

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
