import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { deleteMatch, getMatches, getPlayers, saveMatch } from "@/lib/kv";
import { parseMatchInput } from "@/lib/scoring";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/matches/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const matches = await getMatches();
    if (!matches.some((m) => m.id === id)) {
      return NextResponse.json({ error: "Match not found." }, { status: 404 });
    }

    await deleteMatch(id);

    return NextResponse.json({
      players: await getPlayers(),
      matches: matches.filter((m) => m.id !== id),
    });
  } catch (error) {
    console.error("Failed to undo match in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/matches/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  try {
    const matches = await getMatches();
    const original = matches.find((m) => m.id === id);
    if (!original) {
      return NextResponse.json({ error: "Match not found." }, { status: 404 });
    }

    const parsed = parseMatchInput(body, original.target);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const players = await getPlayers();
    const { winnerId, loserId } = parsed.value;
    if (!players.some((p) => p.id === winnerId) || !players.some((p) => p.id === loserId)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 400 });
    }

    // Records and Elo are derived from history, so replacing the match is all it takes.
    const updated = { ...original, ...parsed.value };
    await saveMatch(updated);

    return NextResponse.json({
      players,
      matches: matches.map((m) => (m.id === id ? updated : m)),
    });
  } catch (error) {
    console.error("Failed to edit match in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
