"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Match, Player } from "@/lib/types";
import { computeEloHistory, computeEloRatings, eloDeltas, eloFor, isRanked, setsPlayed, PLACEMENT_SETS, sortByElo } from "@/lib/stats";
import { formatDate } from "@/lib/format";
import { DEFAULT_TARGET, scoreError } from "@/lib/scoring";
import { Card, PageHeader } from "@/components/ui";

type AuthStatus = "checking" | "unauthenticated" | "authenticated";

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "Something went wrong. Try again.";
}

export default function AdminDashboard() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchEdit, setMatchEdit] = useState({
    winnerId: "",
    loserId: "",
    winnerScore: "",
    loserScore: "",
    target: String(DEFAULT_TARGET),
  });
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
        const data = (await res.json()) as { authenticated: boolean };
        setAuthStatus(data.authenticated ? "authenticated" : "unauthenticated");
      } catch {
        setAuthStatus("unauthenticated");
      }
    })();
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error(await parseErrorMessage(res));
        const data = (await res.json()) as { players: Player[]; matches: Match[] };
        if (!cancelled) {
          setPlayers(data.players);
          setMatches(data.matches);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const eloRatings = useMemo(() => computeEloRatings(players, matches), [players, matches]);
  const eloHistory = useMemo(() => computeEloHistory(players, matches), [players, matches]);
  const sortedPlayers = useMemo(() => sortByElo(players, eloRatings), [players, eloRatings]);
  const recentMatches = useMemo(
    () => [...matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [matches]
  );
  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      setPasscode("");
      setAuthStatus("authenticated");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Failed to log in.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAuthStatus("unauthenticated");
    setPlayers([]);
    setMatches([]);
  }

  async function handleRename(id: string) {
    setSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameEdits[id] ?? "" }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[] };
      setPlayers(data.players);
      setNameEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename player.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[] };
      setPlayers(data.players);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player.");
    } finally {
      setAdding(false);
    }
  }

  async function handleUndo(id: string) {
    setUndoingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/matches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo match.");
    } finally {
      setUndoingId(null);
    }
  }

  function handleStartEditMatch(m: Match) {
    setEditingMatchId(m.id);
    setMatchEdit({
      winnerId: m.winnerId,
      loserId: m.loserId,
      winnerScore: String(m.winnerScore),
      loserScore: String(m.loserScore),
      target: String(m.target),
    });
  }

  function handleCancelEditMatch() {
    setEditingMatchId(null);
  }

  async function handleSaveMatch(id: string) {
    const winnerScoreNum = Number(matchEdit.winnerScore);
    const loserScoreNum = Number(matchEdit.loserScore);
    const targetNum = Number(matchEdit.target);
    if (!matchEdit.winnerId || !matchEdit.loserId || matchEdit.winnerId === matchEdit.loserId) {
      setError("Winner and loser must be different players.");
      return;
    }
    const problem = scoreError(targetNum, winnerScoreNum, loserScoreNum);
    if (problem) {
      setError(problem);
      return;
    }
    setSavingMatchId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: matchEdit.winnerId,
          loserId: matchEdit.loserId,
          winnerScore: winnerScoreNum,
          loserScore: loserScoreNum,
          target: targetNum,
        }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
      setEditingMatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save match.");
    } finally {
      setSavingMatchId(null);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
      setConfirmingReset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset scores.");
    } finally {
      setResetting(false);
    }
  }

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chalk">
        <p className="text-sm text-muted">Checking session…</p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chalk px-4 text-ink">
        <div className="w-full max-w-sm rounded-md border border-line bg-paper p-6">
          <h1 className="mb-1 font-display text-2xl font-semibold">Admin Access</h1>
          <p className="mb-4 text-sm text-muted">
            Enter the admin passcode to manage records.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              autoFocus
              className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-plum"
            />
            <button
              type="submit"
              disabled={loggingIn}
              className="rounded-md bg-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-plum-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingIn ? "Checking…" : "Enter"}
            </button>
            {loginError && (
              <p className="rounded-md bg-loss/10 px-3 py-2 text-sm text-loss">
                {loginError}
              </p>
            )}
          </form>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-muted hover:text-ink"
          >
            ← Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chalk text-ink">
      <PageHeader
        width="max-w-3xl"
        eyebrow="Admin"
        title="Manage the Ladder"
        nav={[{ href: "/", label: "← Ladder" }]}
      >
        <button
          onClick={handleLogout}
          className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-on-grass/80 underline decoration-on-grass/30 underline-offset-4 hover:text-on-grass"
        >
          Log out
        </button>
      </PageHeader>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            {error && (
              <p className="rounded-md bg-loss/10 px-3 py-2 text-sm text-loss">
                {error}
              </p>
            )}

            <Card title="Players">
              <p className="mb-3 text-sm text-muted">
                Records and Elo come from match history. Renaming keeps a player&apos;s matches.
              </p>
              <ul className="flex flex-col gap-2">
                {sortedPlayers.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <input
                      value={nameEdits[p.id] ?? p.name}
                      onChange={(e) => setNameEdits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      aria-label={`Name for ${p.name}`}
                      className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-plum"
                    />
                    <span className="w-12 shrink-0 text-right text-sm text-muted">
                      {isRanked(p.id, matches)
                        ? eloFor(p.id, eloRatings)
                        : `${setsPlayed(p.id, matches)}/${PLACEMENT_SETS}`}
                    </span>
                    <button
                      onClick={() => handleRename(p.id)}
                      disabled={savingId === p.id || (nameEdits[p.id] ?? p.name) === p.name}
                      className="shrink-0 rounded-md border border-line px-3 py-1 text-xs font-medium transition-colors hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {savingId === p.id ? "Saving…" : "Rename"}
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddPlayer} className="mt-4 flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New player name"
                  className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-plum"
                />
                <button
                  type="submit"
                  disabled={adding || newName.trim() === ""}
                  className="shrink-0 rounded-md bg-plum px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-plum-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adding ? "Adding…" : "Add player"}
                </button>
              </form>
            </Card>

            <Card title="Match History">
              {recentMatches.length === 0 ? (
                <p className="text-sm text-muted">No matches recorded yet.</p>
              ) : (
                <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                  {recentMatches.map((m) =>
                    editingMatchId === m.id ? (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 rounded-md bg-chalk px-3 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="flex flex-col gap-1 text-xs text-muted">
                            Winner
                            <select
                              value={matchEdit.winnerId}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, winnerId: e.target.value }))
                              }
                              className="rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-plum"
                            >
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={matchEdit.winnerScore}
                            onChange={(e) =>
                              setMatchEdit((prev) => ({ ...prev, winnerScore: e.target.value }))
                            }
                            placeholder="Score"
                            className="w-20 rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-plum"
                          />
                          <label className="flex flex-col gap-1 text-xs text-muted">
                            Loser
                            <select
                              value={matchEdit.loserId}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, loserId: e.target.value }))
                              }
                              className="rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-plum"
                            >
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={matchEdit.loserScore}
                            onChange={(e) =>
                              setMatchEdit((prev) => ({ ...prev, loserScore: e.target.value }))
                            }
                            placeholder="Score"
                            className="w-20 rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-plum"
                          />
                          <label className="flex flex-col gap-1 text-xs text-muted">
                            First to
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={matchEdit.target}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, target: e.target.value }))
                              }
                              className="w-16 rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-plum"
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveMatch(m.id)}
                            disabled={savingMatchId === m.id}
                            className="rounded-md bg-plum px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-plum-deep disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingMatchId === m.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEditMatch}
                            className="rounded-md border border-line px-3 py-1 text-xs font-medium transition-colors hover:bg-paper"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-chalk px-3 py-2 text-sm"
                      >
                        <span>
                          {(() => {
                            const eloChange = eloHistory.get(m.id);
                            const delta = eloChange ? eloDeltas(eloChange) : null;
                            return (
                              <>
                                <span className="font-medium text-win">
                                  {playerName(m.winnerId)}
                                </span>
                                {delta !== null && (
                                  <span className="ml-1 text-xs text-win/70">
                                    +{delta.winner}
                                  </span>
                                )}{" "}
                                beat{" "}
                                <span className="font-medium text-loss">
                                  {playerName(m.loserId)}
                                </span>
                                {delta !== null && (
                                  <span className="ml-1 text-xs text-loss/70">
                                    {delta.loser === 0 ? "±0" : `−${Math.abs(delta.loser)}`}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          <span className="ml-1.5 text-muted">
                            {m.winnerScore}-{m.loserScore}
                            {m.target !== DEFAULT_TARGET && ` (to ${m.target})`}
                          </span>
                          <span className="ml-2 text-xs text-muted">
                            {formatDate(m.playedAt)}
                          </span>
                        </span>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleStartEditMatch(m)}
                            className="rounded-md border border-line px-3 py-1 text-xs font-medium transition-colors hover:bg-paper"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleUndo(m.id)}
                            disabled={undoingId === m.id}
                            className="rounded-md border border-line px-3 py-1 text-xs font-medium transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {undoingId === m.id ? "Undoing…" : "Undo"}
                          </button>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </Card>

            <Card title="Danger Zone">
              <p className="mb-3 text-sm text-muted">
                Delete every match. Records and Elo go back to zero for everyone. Players are
                kept. This cannot be undone.
              </p>
              {confirmingReset ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="rounded-md bg-loss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-loss/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resetting ? "Resetting…" : "Confirm Reset"}
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-chalk"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="rounded-md border border-loss px-4 py-2 text-sm font-medium text-loss transition-colors hover:bg-loss/10"
                >
                  Reset All Scores
                </button>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
