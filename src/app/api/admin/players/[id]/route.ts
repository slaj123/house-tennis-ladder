import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getPlayers, setPlayers } from "@/lib/kv";
import { parsePlayerName } from "@/lib/players";

/** Rename a player. Their id (and so their match history) stays the same. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/players/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  try {
    const players = await getPlayers();
    if (!players.some((p) => p.id === id)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 404 });
    }

    const parsed = parsePlayerName(body?.name, players, id);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updated = players.map((p) => (p.id === id ? { ...p, name: parsed.name } : p));
    await setPlayers(updated);

    return NextResponse.json({ players: updated });
  } catch (error) {
    console.error("Failed to update player in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
