import type { Player } from "@/lib/types";

export const MAX_NAME_LENGTH = 20;

/** Validates a display name; `selfId` lets a player keep their own name on rename. */
export function parsePlayerName(
  raw: unknown,
  players: Player[],
  selfId?: string
): { ok: true; name: string } | { ok: false; error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Names can be at most ${MAX_NAME_LENGTH} characters.` };
  }
  const taken = players.some((p) => p.id !== selfId && p.name.toLowerCase() === name.toLowerCase());
  if (taken) return { ok: false, error: `There's already a player named ${name}.` };
  return { ok: true, name };
}
