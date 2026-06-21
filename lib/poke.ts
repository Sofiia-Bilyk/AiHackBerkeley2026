import "server-only";
import type { Profile } from "./types";

type PokeReason = "dm" | "event_confirmed" | "task_claimed" | "task_completed";

type PokePayload = {
  to: string;
  name: string;
  reason: PokeReason;
  message: string;
  metadata?: Record<string, string>;
};

export async function sendPoke(profile: Profile | undefined, payload: Omit<PokePayload, "to" | "name">) {
  if (!profile?.phone) return { ok: false, skipped: "missing_phone" as const };

  const body: PokePayload = {
    to: profile.phone,
    name: profile.name,
    ...payload,
  };

  const endpoint = process.env.POKE_API_URL;
  const apiKey = process.env.POKE_API_KEY;

  if (!endpoint) {
    console.info("[poke:demo]", body);
    return { ok: true, demo: true as const };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[poke:error]", response.status, detail);
    return { ok: false, status: response.status };
  }

  return { ok: true };
}
