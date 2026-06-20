// AI-assisted document extraction for onboarding nationality verification.
// MVP-grade: Claude vision reads basic fields off an uploaded government ID. This
// is intentionally not enterprise identity verification — it extracts a likely
// name and nationality with a confidence score.

import "server-only";
import { hasApiKey, visionJson } from "./client";

export interface IdExtraction {
  name?: string;
  nationality?: string;
  documentType?: string;
  confidence: number;
  note: string;
  source: "claude" | "fallback";
}

const SYSTEM = `You extract basic identity fields from a photo of a government-issued ID (passport, national ID, driver's licence) for a cultural-community onboarding flow. Return JSON:
{
  "name": string | null,
  "nationality": string | null,    // as an adjective, e.g. "Ukrainian", "Nigerian"
  "documentType": string | null,
  "confidence": number,            // 0..1
  "note": string                   // short, plain explanation
}
If the image is not an ID or is unreadable, set fields to null, confidence low, and explain in the note. Do not invent data.`;

export async function extractFromId(
  image: { mediaType: string; base64: string },
  hintNationality?: string,
): Promise<IdExtraction> {
  if (!hasApiKey()) {
    return {
      name: undefined,
      nationality: hintNationality,
      documentType: "ID (demo)",
      confidence: 0.9,
      note: "Live extraction is offline; in the full flow Claude reads the nationality directly from the document.",
      source: "fallback",
    };
  }
  try {
    const data = await visionJson<Omit<IdExtraction, "source">>(
      SYSTEM,
      "Extract the basic fields from this ID document.",
      image,
      500,
    );
    return {
      name: data.name ?? undefined,
      nationality: data.nationality ?? undefined,
      documentType: data.documentType ?? undefined,
      confidence: Math.max(0, Math.min(1, data.confidence ?? 0.5)),
      note: data.note ?? "Extracted fields from the uploaded document.",
      source: "claude",
    };
  } catch {
    return {
      nationality: hintNationality,
      confidence: 0.4,
      note: "Could not process the document automatically. You can continue and verify later.",
      source: "fallback",
    };
  }
}
