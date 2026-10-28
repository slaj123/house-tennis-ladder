import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { clearMatches, getPlayers } from "@/lib/kv";

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  try {
    // Records and Elo come from match history, so clearing matches resets everything.
    await clearMatches();
    return NextResponse.json({ players: await getPlayers(), matches: [] });
  } catch (error) {
    console.error("Failed to reset leaderboard in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
