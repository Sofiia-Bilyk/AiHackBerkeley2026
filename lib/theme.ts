import type { CSSProperties } from "react";
import type { Community } from "./types";

/** Inline CSS custom properties that re-theme the accent for a community. */
export function accentStyle(community: Community): CSSProperties {
  return {
    ["--accent-from" as string]: community.accent.from,
    ["--accent-to" as string]: community.accent.to,
    ["--accent-soft" as string]: community.accent.soft,
    ["--accent-ink" as string]: community.accent.ink,
    ["--ring" as string]: community.accent.from,
  } as CSSProperties;
}
