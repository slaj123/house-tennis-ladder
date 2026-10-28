import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getPlayers, setPlayers } from "@/lib/kv";
import { parsePlayerName } from "@/lib/players";

/** Add a new player. */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    const players = await getPlayers();
    const parsed = parsePlayerName(body?.name, players);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Ids are never reused, so old matches can never attach to a new person.
    const base = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player";
    let id = base;
    for (let n = 2; players.some((p) => p.id === id); n++) id = `${base}-${n}`;

    const updated = [...players, { id, name: parsed.name }];
    await setPlayers(updated);

    return NextResponse.json({ players: updated });
  } catch (error) {
    console.error("Failed to add player in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
