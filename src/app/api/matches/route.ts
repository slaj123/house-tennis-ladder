import { NextResponse } from "next/server";
import { getMatches, getPlayers, isRateLimited, saveMatch } from "@/lib/kv";
import { parseMatchInput } from "@/lib/scoring";
import type { Match } from "@/lib/types";

// Logging is open to anyone with the link, so cap it per device to stop spam.
const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;

export async function POST(request: Request) {
  const parsed = parseMatchInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { winnerId, loserId, target, winnerScore, loserScore } = parsed.value;

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (await isRateLimited(`matches:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS)) {
      return NextResponse.json(
        { error: "Too many matches logged in the last minute. Wait a bit and try again." },
        { status: 429 }
      );
    }

    const players = await getPlayers();
    if (!players.some((p) => p.id === winnerId) || !players.some((p) => p.id === loserId)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 400 });
    }

    const match: Match = {
      id: crypto.randomUUID(),
      winnerId,
      loserId,
      playedAt: new Date().toISOString(),
      target,
      winnerScore,
      loserScore,
    };
    await saveMatch(match);

    return NextResponse.json({ players, matches: await getMatches(), match });
  } catch (error) {
    console.error("Failed to record match in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
