import { INITIAL_PLAYERS, type Match, type Player } from "@/lib/types";
import { DEFAULT_TARGET } from "@/lib/scoring";

export interface PlayerRecord {
  wins: number;
  losses: number;
}

/** Wins and losses are derived from match history, never stored, so they can't drift. */
export function computeRecords(players: Player[], matches: Match[]): Map<string, PlayerRecord> {
  const records = new Map<string, PlayerRecord>();
  for (const p of players) records.set(p.id, { wins: 0, losses: 0 });
  for (const m of matches) {
    const w = records.get(m.winnerId);
    const l = records.get(m.loserId);
    if (w) w.wins++;
    if (l) l.losses++;
  }
  return records;
}

export function winPct(record: PlayerRecord): number {
  const played = record.wins + record.losses;
  return played === 0 ? 0 : (record.wins / played) * 100;
}

export interface Streak {
  type: "W" | "L";
  count: number;
}

export function currentStreak(playerId: string, matches: Match[]): Streak | null {
  const playerMatches = matches
    .filter((m) => m.winnerId === playerId || m.loserId === playerId)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  if (playerMatches.length === 0) return null;

  const type: Streak["type"] = playerMatches[0].winnerId === playerId ? "W" : "L";
  let count = 0;
  for (const m of playerMatches) {
    const isWin = m.winnerId === playerId;
    if ((isWin && type === "W") || (!isWin && type === "L")) {
      count++;
    } else {
      break;
    }
  }
  return { type, count };
}

export interface HeadToHeadRecord {
  opponentId: string;
  wins: number;
  losses: number;
}

export function headToHead(playerId: string, matches: Match[]): HeadToHeadRecord[] {
  const records = new Map<string, HeadToHeadRecord>();

  for (const m of matches) {
    if (m.winnerId === playerId) {
      const rec = records.get(m.loserId) ?? { opponentId: m.loserId, wins: 0, losses: 0 };
      rec.wins++;
      records.set(m.loserId, rec);
    } else if (m.loserId === playerId) {
      const rec = records.get(m.winnerId) ?? { opponentId: m.winnerId, wins: 0, losses: 0 };
      rec.losses++;
      records.set(m.winnerId, rec);
    }
  }

  return [...records.values()].sort((a, b) => b.wins + b.losses - (a.wins + a.losses));
}

export const STARTING_ELO = 1500;
const CORE_PLAYER_IDS = new Set(INITIAL_PLAYERS.map((p) => p.id));
export const ELO_K = 32;
export const MOV_CAP = 2;

/** Probability the winner "should" have won, based on the pre-match rating gap alone. */
export function expectedScore(winnerElo: number, loserElo: number): number {
  return 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
}

/**
 * How lopsided the set was, as a share of the target: 1 + margin / target.
 * A shutout (3-0, 6-0) doubles the shift; 3-2 or 7-6 barely moves it.
 */
export function movMultiplier(winnerScore: number, loserScore: number, target: number): number {
  const margin = Math.max(0, winnerScore - loserScore);
  return Math.min(MOV_CAP, 1 + margin / Math.max(1, target));
}

/**
 * Longer sets are better evidence of skill, so they count a bit more:
 * sqrt(target / 3). First to 3 = 1x, first to 6 ≈ 1.41x, first to 1 ≈ 0.58x.
 */
export function lengthWeight(target: number): number {
  return Math.sqrt(Math.max(1, target) / DEFAULT_TARGET);
}

/** Rating points the winner gains (and loser loses) for a single match. */
export function eloDelta(
  winnerElo: number,
  loserElo: number,
  winnerScore: number,
  loserScore: number,
  target: number
): number {
  return (
    ELO_K *
    (1 - expectedScore(winnerElo, loserElo)) *
    movMultiplier(winnerScore, loserScore, target) *
    lengthWeight(target)
  );
}

export interface EloMatchResult {
  winnerEloBefore: number;
  winnerEloAfter: number;
  loserEloBefore: number;
  loserEloAfter: number;
}

/** Sets a newcomer must play before their rating counts and is shown. */
export const PLACEMENT_SETS = 5;

/** The founding roommates are ranked from day one; anyone added later must place in. */
export function isCorePlayer(playerId: string): boolean {
  return CORE_PLAYER_IDS.has(playerId);
}

interface EloState {
  ratings: Map<string, number>;
  played: Map<string, number>;
}

function isRankedIn(state: EloState, playerId: string): boolean {
  return isCorePlayer(playerId) || (state.played.get(playerId) ?? 0) >= PLACEMENT_SETS;
}

/**
 * A ranked player's rating is frozen against an unranked opponent, so a guest
 * or sandbagger can't move the ladder. The unranked side still moves, so their
 * hidden rating is calibrated by the time it's revealed.
 */
function applyEloMatch(state: EloState, m: Match): EloMatchResult {
  const { ratings, played } = state;
  const winnerBefore = ratings.get(m.winnerId) ?? STARTING_ELO;
  const loserBefore = ratings.get(m.loserId) ?? STARTING_ELO;
  const winnerRanked = isRankedIn(state, m.winnerId);
  const loserRanked = isRankedIn(state, m.loserId);

  const delta = eloDelta(winnerBefore, loserBefore, m.winnerScore, m.loserScore, m.target);
  const winnerAfter = winnerRanked && !loserRanked ? winnerBefore : winnerBefore + delta;
  const loserAfter = loserRanked && !winnerRanked ? loserBefore : loserBefore - delta;

  ratings.set(m.winnerId, winnerAfter);
  ratings.set(m.loserId, loserAfter);
  played.set(m.winnerId, (played.get(m.winnerId) ?? 0) + 1);
  played.set(m.loserId, (played.get(m.loserId) ?? 0) + 1);

  return {
    winnerEloBefore: winnerBefore,
    winnerEloAfter: winnerAfter,
    loserEloBefore: loserBefore,
    loserEloAfter: loserAfter,
  };
}

function replayElo(players: Player[], matches: Match[]): { state: EloState; history: Map<string, EloMatchResult> } {
  const state: EloState = { ratings: new Map(), played: new Map() };
  for (const p of players) state.ratings.set(p.id, STARTING_ELO);

  const ordered = [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const history = new Map<string, EloMatchResult>();
  for (const m of ordered) history.set(m.id, applyEloMatch(state, m));

  return { state, history };
}

/**
 * Elo ratings are derived fresh from full match history rather than stored
 * incrementally, so editing or undoing any past match (not just the latest)
 * stays correct automatically.
 */
export function computeEloRatings(players: Player[], matches: Match[]): Map<string, number> {
  return replayElo(players, matches).state.ratings;
}

/** Per-match Elo before/after for both players, keyed by match id. */
export function computeEloHistory(players: Player[], matches: Match[]): Map<string, EloMatchResult> {
  return replayElo(players, matches).history;
}

/** Sets played so far, for anyone still placing in. */
export function setsPlayed(playerId: string, matches: Match[]): number {
  return matches.filter((m) => m.winnerId === playerId || m.loserId === playerId).length;
}

export function isRanked(playerId: string, matches: Match[]): boolean {
  return isCorePlayer(playerId) || setsPlayed(playerId, matches) >= PLACEMENT_SETS;
}

/** Rounded Elo change for each side of one match (they differ when one side was frozen). */
export function eloDeltas(change: EloMatchResult): { winner: number; loser: number } {
  return {
    winner: Math.round(change.winnerEloAfter - change.winnerEloBefore),
    loser: Math.round(change.loserEloAfter - change.loserEloBefore),
  };
}

/** Longest run of consecutive wins in a player's history. */
export function bestWinStreak(playerId: string, matches: Match[]): number {
  const ordered = matches
    .filter((m) => m.winnerId === playerId || m.loserId === playerId)
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  let best = 0;
  let run = 0;
  for (const m of ordered) {
    run = m.winnerId === playerId ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function eloFor(playerId: string, ratings: Map<string, number>): number {
  return Math.round(ratings.get(playerId) ?? STARTING_ELO);
}

/** Average games won minus games lost per match. */
export function avgGameDiff(playerId: string, matches: Match[]): number | null {
  const played = matches.filter((m) => m.winnerId === playerId || m.loserId === playerId);
  if (played.length === 0) return null;
  const total = played.reduce(
    (sum, m) => sum + (m.winnerId === playerId ? 1 : -1) * (m.winnerScore - m.loserScore),
    0
  );
  return total / played.length;
}

export function sortByElo(players: Player[], ratings: Map<string, number>): Player[] {
  return [...players].sort((a, b) => {
    const eloA = eloFor(a.id, ratings);
    const eloB = eloFor(b.id, ratings);
    if (eloB !== eloA) return eloB - eloA;
    return a.name.localeCompare(b.name);
  });
}
