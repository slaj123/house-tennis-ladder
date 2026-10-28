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

// Starting roster. Edit these to your group's names (or add players later in /admin).
export const INITIAL_PLAYERS: Player[] = [
  { id: "alex", name: "Alex" },
  { id: "sam", name: "Sam" },
  { id: "jordan", name: "Jordan" },
  { id: "taylor", name: "Taylor" },
  { id: "casey", name: "Casey" },
  { id: "riley", name: "Riley" },
];

export const PLAYERS_KEY = "tennis:players";
// A hash of matchId -> match, so each save touches only its own field and two
// people logging at once can't overwrite each other.
export const MATCHES_KEY = "tennis:matches-by-id";
