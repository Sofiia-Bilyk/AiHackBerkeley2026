// Demo session — a signed-cookie-free, single-value session that just stores the
// current persona's profile id. No real auth for the local MVP; the seam is here
// to swap in Supabase Auth later.

import "server-only";
import { cookies } from "next/headers";
import { db } from "./store";
import type { Profile } from "./types";

const COOKIE = "connect_pid";

export async function getSessionProfileId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const id = await getSessionProfileId();
  if (!id) return null;
  return db.profile(id) ?? null;
}

export async function setSession(profileId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** The community the current persona primarily belongs to. */
export async function getCurrentCommunityId(): Promise<string | null> {
  const id = await getSessionProfileId();
  if (!id) return null;
  const m = db.membershipsFor(id)[0];
  return m?.communityId ?? null;
}
