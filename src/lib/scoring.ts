// Games to win a set by default (1-10). Set NEXT_PUBLIC_SET_LENGTH to change it; `npm run setup` asks.
export const DEFAULT_TARGET = Math.min(10, Math.max(1, Math.round(Number(process.env.NEXT_PUBLIC_SET_LENGTH)) || 3));
export const MIN_TARGET = 1;
export const MAX_TARGET = 10;

/**
 * Returns an error message, or null if the score is a legal finished set.
 * Normal finish: winner reaches the target, loser is below it (3-1, 6-4).
 * Extended finish: winner goes one past the target from a close set (7-5, 7-6).
 */
export function scoreError(target: number, winnerScore: number, loserScore: number): string | null {
  if (!Number.isInteger(target) || target < MIN_TARGET || target > MAX_TARGET) {
    return `"First to" must be a whole number from ${MIN_TARGET} to ${MAX_TARGET}.`;
  }
  if (!Number.isInteger(winnerScore) || !Number.isInteger(loserScore) || winnerScore < 0 || loserScore < 0) {
    return "Games won must be whole numbers, 0 or more.";
  }
  if (winnerScore <= loserScore) {
    return "Someone has to win: the scores can't be tied.";
  }
  const normal = winnerScore === target && loserScore < target;
  const extended = winnerScore === target + 1 && loserScore >= target - 1;
  if (normal || extended) return null;
  if (winnerScore < target) return `Not finished yet: the winner needs ${target} games.`;
  return `${winnerScore}-${loserScore} isn't a possible score in a first-to-${target} set.`;
}

export interface MatchInput {
  winnerId: string;
  loserId: string;
  target: number;
  winnerScore: number;
  loserScore: number;
}

/** Validates an untrusted request body into a MatchInput. */
export function parseMatchInput(
  body: unknown,
  fallbackTarget = DEFAULT_TARGET
): { ok: true; value: MatchInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const winnerId = typeof b.winnerId === "string" ? b.winnerId : "";
  const loserId = typeof b.loserId === "string" ? b.loserId : "";
  if (!winnerId || !loserId || winnerId === loserId) {
    return { ok: false, error: "Pick two different players." };
  }
  const num = (v: unknown) => (v === undefined || v === null || v === "" ? NaN : Number(v));
  const target = b.target === undefined ? fallbackTarget : num(b.target);
  const winnerScore = num(b.winnerScore);
  const loserScore = num(b.loserScore);
  const error = scoreError(target, winnerScore, loserScore);
  if (error) return { ok: false, error };
  return { ok: true, value: { winnerId, loserId, target, winnerScore, loserScore } };
}
