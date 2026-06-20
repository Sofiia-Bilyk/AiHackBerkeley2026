// Thin Anthropic client wrapper. Every AI feature degrades gracefully: when no
// ANTHROPIC_API_KEY is present (or a call fails), the calling feature falls back
// to a culturally-grounded canned response so the platform always demos.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;

export function hasApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Whether the last/most-recent generation came from the live model. */
export interface AiResult<T> {
  data: T;
  source: "claude" | "fallback";
}

/** Plain text completion. */
export async function complete(
  system: string,
  user: string,
  maxTokens = 1200,
): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return textOf(res);
}

/**
 * Structured JSON completion. We instruct the model to return a single JSON
 * object and parse it defensively (stripping any prose or code fences).
 */
export async function completeJson<T>(
  system: string,
  user: string,
  maxTokens = 2000,
): Promise<T> {
  const raw = await complete(
    system + "\n\nRespond with ONLY a single valid JSON object. No markdown, no prose.",
    user,
    maxTokens,
  );
  return parseJson<T>(raw);
}

/** Vision call: evaluate an image (data URL or base64) against a question. */
export async function visionJson<T>(
  system: string,
  question: string,
  image: { mediaType: string; base64: string },
  maxTokens = 700,
): Promise<T> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system:
      system + "\n\nRespond with ONLY a single valid JSON object. No markdown, no prose.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: image.base64,
            },
          },
          { type: "text", text: question },
        ],
      },
    ],
  });
  return parseJson<T>(textOf(res));
}

function textOf(res: Anthropic.Message): string {
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function parseJson<T>(raw: string): T {
  let text = raw.trim();
  // strip code fences if the model added them
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  // grab the outermost JSON object/array
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text) as T;
}
