import "server-only";
import { COMMUNITIES, CREATABLE_COMMUNITIES } from "./communities";
import { db } from "./store";

export function allCommunities() {
  const created = typeof db.createdCommunities === "function" ? db.createdCommunities() : [];
  return [...COMMUNITIES, ...created];
}

export function onboardingCommunities(includeCreatable: boolean) {
  return includeCreatable ? [...allCommunities(), ...CREATABLE_COMMUNITIES] : allCommunities();
}

export function communityById(id: string) {
  return [...allCommunities(), ...CREATABLE_COMMUNITIES].find((community) => community.id === id);
}

export function communityByNationality(nationality: string) {
  return [...allCommunities(), ...CREATABLE_COMMUNITIES].find((community) => community.nationality === nationality);
}
