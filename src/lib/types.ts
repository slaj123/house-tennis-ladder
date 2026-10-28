export interface Player {
  id: string;
  name: string;
}

/** One match = one short set: first player to `target` games wins. */
export interface Match {
  id: string;
  winnerId: string;
  loserId: string;
  playedAt: string;
  target: number;
  winnerScore: number;
  loserScore: number;
}

// Your starting roster: these players are ranked from day one; anyone added later in
// /admin plays PLACEMENT_SETS sets first. Set NEXT_PUBLIC_LADDER_PLAYERS (comma-separated
// names) in .env.local and in Vercel, so names stay out of the repo. `npm run setup` does it.
const ROSTER = process.env.NEXT_PUBLIC_LADDER_PLAYERS || "Alex,Sam,Jordan,Taylor,Casey,Riley";

export const playerId = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player";

export const INITIAL_PLAYERS: Player[] = [
  ...new Map(
    ROSTER.split(",").map((n) => n.trim().replace(/\s+/g, " ").slice(0, 20)).filter(Boolean)
      .map((name) => [playerId(name), { id: playerId(name), name }] as const)
  ).values(),
];

export const PLAYERS_KEY = "tennis:players";
// A hash of matchId -> match, so each save touches only its own field and two
// people logging at once can't overwrite each other.
export const MATCHES_KEY = "tennis:matches-by-id";
