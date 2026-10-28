"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { INITIAL_PLAYERS, type Match, type Player } from "@/lib/types";
import {
  PLACEMENT_SETS,
  avgGameDiff,
  bestWinStreak,
  computeEloHistory,
  computeEloRatings,
  computeRecords,
  currentStreak,
  eloDeltas,
  eloFor,
  headToHead,
  isRanked,
  setsPlayed,
  sortByElo,
  winPct,
} from "@/lib/stats";
import { Card, MatchRow, PageHeader, StatCard, StreakBadge } from "@/components/ui";
import MatchLogger, { type SavedMatch } from "@/components/MatchLogger";

const REFRESH_MS = 30_000;
const TOAST_MS = 6_000;

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "Something went wrong. Try again.";
}

const selectClass =
  "h-11 min-w-0 flex-1 rounded-md border border-line bg-paper px-3 text-sm font-semibold text-ink outline-none focus:border-plum";

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [toast, setToast] = useState("");
  const [lastChange, setLastChange] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [comparePick, setComparePick] = useState<{ a?: string; b?: string }>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Stay current when a roommate logs a match: poll while visible, and
  // refetch as soon as the app comes back to the foreground.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const compareAId = comparePick.a ?? players[0]?.id ?? "";
  const compareBId = comparePick.b ?? players[1]?.id ?? compareAId;
  const setCompareAId = (a: string) => setComparePick((prev) => ({ ...prev, a }));
  const setCompareBId = (b: string) => setComparePick((prev) => ({ ...prev, b }));

  const eloRatings = useMemo(() => computeEloRatings(players, matches), [players, matches]);
  const eloHistory = useMemo(() => computeEloHistory(players, matches), [players, matches]);
  const sortedPlayers = useMemo(() => sortByElo(players, eloRatings), [players, eloRatings]);
  // Newcomers sit below the ladder, unnumbered, until they've placed in.
  const rankedPlayers = sortedPlayers.filter((p) => isRanked(p.id, matches));
  const unrankedPlayers = sortedPlayers
    .filter((p) => !isRanked(p.id, matches))
    .sort((a, b) => setsPlayed(b.id, matches) - setsPlayed(a.id, matches) || a.name.localeCompare(b.name));
  const eloLabel = (id: string) => (isRanked(id, matches) ? `${eloFor(id, eloRatings)} Elo` : "Unranked");
  const records = useMemo(() => computeRecords(players, matches), [players, matches]);
  const recordOf = (id: string) => records.get(id) ?? { wins: 0, losses: 0 };

  const recentMatches = useMemo(
    () => [...matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [matches]
  );

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

  const { hottest, coldest } = useMemo(() => {
    const streaks = players
      .map((p) => ({ player: p, streak: currentStreak(p.id, matches) }))
      .filter((s): s is { player: Player; streak: NonNullable<typeof s.streak> } => s.streak !== null);

    const hottest = streaks
      .filter((s) => s.streak.type === "W")
      .sort((a, b) => b.streak.count - a.streak.count)[0];
    const coldest = streaks
      .filter((s) => s.streak.type === "L")
      .sort((a, b) => b.streak.count - a.streak.count)[0];

    return { hottest, coldest };
  }, [players, matches]);

  function handleSaved(data: SavedMatch) {
    setPlayers(data.players);
    setMatches(data.matches);
    const change = computeEloHistory(data.players, data.matches).get(data.match.id);
    const name = (id: string) => data.players.find((p) => p.id === id)?.name ?? "Unknown";
    if (change) {
      const d = eloDeltas(change);
      // A placing player's rating is hidden, so show their progress instead of points.
      const side = (id: string, delta: number) =>
        isRanked(id, data.matches)
          ? `${name(id)} ${delta >= 0 ? "+" : "−"}${Math.abs(delta)}`
          : `${name(id)} placing ${setsPlayed(id, data.matches)}/${PLACEMENT_SETS}`;
      const message = `Saved · ${side(data.match.winnerId, d.winner)} · ${side(data.match.loserId, d.loser)}`;
      setFlash(message);
      setToast(message);
      const changes: Record<string, number> = {};
      if (isRanked(data.match.winnerId, data.matches)) changes[data.match.winnerId] = d.winner;
      if (isRanked(data.match.loserId, data.matches)) changes[data.match.loserId] = d.loser;
      setLastChange(changes);
    }
    setSheetOpen(false);
  }

  const totalMatches = matches.length;
  const leader = rankedPlayers.find((p) => recordOf(p.id).wins + recordOf(p.id).losses > 0);

  const compareA = players.find((p) => p.id === compareAId) ?? null;
  const compareB = players.find((p) => p.id === compareBId) ?? null;
  const compareMatches = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (m.winnerId === compareAId && m.loserId === compareBId) ||
            (m.winnerId === compareBId && m.loserId === compareAId)
        )
        .sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [matches, compareAId, compareBId]
  );
  const compareAWins = compareMatches.filter((m) => m.winnerId === compareAId).length;
  const compareBWins = compareMatches.length - compareAWins;
  const compareAvgMargin =
    compareMatches.length === 0
      ? null
      : compareMatches.reduce(
          (sum, m) => sum + (m.winnerId === compareAId ? 1 : -1) * (m.winnerScore - m.loserScore),
          0
        ) / compareMatches.length;
  const compareStreak = currentStreak(compareAId, compareMatches);

  const deltaFor = (m: Match) => {
    const change = eloHistory.get(m.id);
    if (!change) return null;
    const d = eloDeltas(change);
    if (d.winner === -d.loser) return `±${d.winner}`;
    const signed = (n: number) => (n === 0 ? "0" : n > 0 ? `+${n}` : `−${Math.abs(n)}`);
    return `${signed(d.winner)} / ${signed(d.loser)}`;
  };

  const playerMatchRows = (list: Match[]) =>
    list.map((m) => (
      <MatchRow
        key={m.id}
        winnerName={playerName(m.winnerId)}
        loserName={playerName(m.loserId)}
        winnerScore={m.winnerScore}
        loserScore={m.loserScore}
        target={m.target}
        playedAt={m.playedAt}
        delta={deltaFor(m)}
      />
    ));

  function renderPlayerRow(p: Player, rank: number | null) {
    const isExpanded = expandedId === p.id;
    const diff = avgGameDiff(p.id, matches);
    const rec = recordOf(p.id);
    const played = rec.wins + rec.losses;
    const h2h = headToHead(p.id, matches);
    const change = lastChange[p.id];
    const isLeader = rank === 1 && played > 0;
    const streak = currentStreak(p.id, matches);
    const best = bestWinStreak(p.id, matches);
    const history = recentMatches.filter((m) => m.winnerId === p.id || m.loserId === p.id);
    return (
      <li key={p.id} className="border-b border-line last:border-0">
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : p.id)}
          aria-expanded={isExpanded}
          className="flex w-full items-center gap-3 py-3 text-left"
        >
          <span
            className={
              "relative w-7 shrink-0 font-mono text-2xl font-semibold leading-none " +
              (isLeader ? "text-ink" : "text-muted")
            }
          >
            {rank ?? "–"}
            {isLeader && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-1 h-2.5 w-2.5 rounded-full bg-gold ring-1 ring-ink/20"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg font-semibold leading-tight">{p.name}</span>
            <span className="mt-0.5 block font-mono text-[11px] text-muted">
              <span className="text-win">{rec.wins}W</span> <span className="text-loss">{rec.losses}L</span>
              {played > 0 && ` · ${winPct(rec).toFixed(0)}%`}
              {diff !== null && ` · ${diff > 0 ? "+" : ""}${diff.toFixed(1)} g`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {change !== undefined && (
              <span className={"font-mono text-[11px] " + (change >= 0 ? "text-win" : "text-loss")}>
                {change >= 0 ? "+" : "−"}
                {Math.abs(change)}
              </span>
            )}
            {rank === null ? (
              <span className="font-mono text-sm font-semibold tabular-nums text-muted">
                {played}/{PLACEMENT_SETS}
              </span>
            ) : (
              <span className="font-mono text-lg font-semibold tabular-nums">{eloFor(p.id, eloRatings)}</span>
            )}
            <StreakBadge streak={streak} />
          </span>
        </button>
        {isExpanded && (
          <div className="mb-3 rounded-md bg-chalk p-3">
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Current run"
                value={streak ? `${streak.type}${streak.count}` : "—"}
                accent={streak?.type === "W" ? "win" : streak ? "loss" : undefined}
              />
              <StatCard label="Best win run" value={best > 0 ? `W${best}` : "—"} accent={best > 0 ? "win" : undefined} />
            </div>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Head-to-head</p>
            {h2h.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No sets yet.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {h2h.map((r) => (
                  <li key={r.opponentId} className="flex justify-between text-sm">
                    <span className="truncate">vs {playerName(r.opponentId)}</span>
                    <span className="font-mono">
                      <span className="text-win">{r.wins}</span>
                      <span className="text-muted">-</span>
                      <span className="text-loss">{r.losses}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {history.length > 0 && (
              <>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  Match history · {history.length}
                </p>
                <ul className="max-h-64 overflow-y-auto">{playerMatchRows(history)}</ul>
              </>
            )}
          </div>
        )}
      </li>
    );
  }


  return (
    <div className="min-h-screen bg-chalk pb-28 text-ink lg:pb-12">
      <PageHeader
        eyebrow="Roommate Championships"
        title="Tennis Ladder"
        nav={[
          { href: "/elo", label: "How Elo works" },
          { href: "/admin", label: "Admin" },
        ]}
      >
        <div className="mt-6 flex items-end gap-4 border-t border-on-grass/20 pt-5">
          {leader ? (
            <>
              <span className="font-mono text-[44px] font-semibold leading-none text-gold">1</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-grass/60">
                  Top of the ladder
                </p>
                <p className="truncate font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  {leader.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold leading-none sm:text-3xl">
                  {eloFor(leader.id, eloRatings)}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-grass/60">Elo</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-on-grass/80">
              {loading ? "Loading the ladder…" : "No sets logged yet. The first one decides who's on top."}
            </p>
          )}
        </div>
      </PageHeader>

      <main className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        {error && <p className="mb-4 rounded-md bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <section className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard label="Sets" value={totalMatches} />
              <StatCard
                label="Hottest"
                value={hottest ? `${hottest.player.name} W${hottest.streak.count}` : "—"}
                accent="win"
              />
              <StatCard
                label="Coldest"
                value={coldest ? `${coldest.player.name} L${coldest.streak.count}` : "—"}
                accent="loss"
              />
            </section>

            <Card title="Rankings" action={<span className="font-mono text-[11px] text-muted">tap a name</span>}>
              <ol>{rankedPlayers.map((p, i) => renderPlayerRow(p, i + 1))}</ol>
              {unrankedPlayers.length > 0 && (
                <>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                    Unranked · places in after {PLACEMENT_SETS} sets
                  </p>
                  <ul>{unrankedPlayers.map((p) => renderPlayerRow(p, null))}</ul>
                </>
              )}
            </Card>

            <Card title="Results">
              {recentMatches.length === 0 ? (
                <p className="text-sm text-muted">Nothing logged yet.</p>
              ) : (
                <ul className="max-h-[26rem] overflow-y-auto">
                  {playerMatchRows(recentMatches)}
                </ul>
              )}
            </Card>

            <Card title="Head to Head">
              <div className="flex items-center gap-2">
                <select
                  aria-label="First player"
                  value={compareAId}
                  onChange={(e) => setCompareAId(e.target.value)}
                  className={selectClass}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-xs uppercase text-muted">vs</span>
                <select
                  aria-label="Second player"
                  value={compareBId}
                  onChange={(e) => setCompareBId(e.target.value)}
                  className={selectClass}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {compareAId === compareBId ? (
                <p className="mt-4 text-sm text-muted">Pick two different players.</p>
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-between rounded-md bg-grass px-4 py-3 text-on-grass">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">{compareA?.name}</p>
                      <p className="font-mono text-xs text-on-grass/70">{eloLabel(compareAId)}</p>
                    </div>
                    <span className="flex items-center gap-0.5">
                      <span className="flip-tile inline-flex h-12 w-10 items-center justify-center rounded-[3px] font-mono text-[28px] font-semibold">
                        {compareAWins}
                      </span>
                      <span className="flip-tile inline-flex h-12 w-10 items-center justify-center rounded-[3px] font-mono text-[28px] font-semibold">
                        {compareBWins}
                      </span>
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="truncate font-display text-lg font-semibold">{compareB?.name}</p>
                      <p className="font-mono text-xs text-on-grass/70">{eloLabel(compareBId)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <StatCard
                      label={`${compareA?.name ?? ""} avg games`}
                      value={
                        compareAvgMargin === null
                          ? "—"
                          : `${compareAvgMargin > 0 ? "+" : ""}${compareAvgMargin.toFixed(1)}`
                      }
                    />
                    <StatCard
                      label="Current run"
                      value={compareStreak ? `${compareA?.name ?? ""} ${compareStreak.type}${compareStreak.count}` : "—"}
                      accent={compareStreak?.type === "W" ? "win" : compareStreak?.type === "L" ? "loss" : undefined}
                    />
                  </div>
                  {compareMatches.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">
                      {compareA?.name} and {compareB?.name} haven&apos;t played yet.
                    </p>
                  ) : (
                    <ul className="mt-2 max-h-80 overflow-y-auto">
                      {playerMatchRows(compareMatches)}
                    </ul>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* Phone: a bottom sheet. Desktop: a sticky side panel. Same logger either way. */}
          <div
            aria-hidden={!sheetOpen}
            onClick={() => setSheetOpen(false)}
            className={
              "fixed inset-0 z-40 bg-ink/50 transition-opacity lg:hidden " +
              (sheetOpen ? "opacity-100" : "pointer-events-none opacity-0")
            }
          />
          <aside
            className={
              // Fixed height on phones: a bottom-anchored sheet that grew with its content
              // would slide the +/− buttons out from under your thumb mid-entry.
              "fixed inset-x-0 bottom-0 z-50 h-[min(88dvh,680px)] overflow-y-auto rounded-t-xl border-t border-line bg-paper px-4 pb-8 pt-3 transition-transform duration-300 " +
              "lg:sticky lg:top-6 lg:z-auto lg:col-span-5 lg:h-auto lg:translate-y-0 lg:self-start lg:overflow-visible lg:rounded-md lg:border lg:p-5 " +
              (sheetOpen ? "translate-y-0" : "translate-y-full")
            }
          >
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line lg:hidden" />
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight text-plum">Log a Set</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted underline underline-offset-4 lg:hidden"
              >
                Close
              </button>
            </div>
            <div aria-hidden className="relative my-3 h-px bg-line">
              <span className="absolute left-1/2 top-[-4px] h-[9px] w-px -translate-x-1/2 bg-muted" />
            </div>
            <MatchLogger players={players} flash={flash} onSaved={handleSaved} />
          </aside>
        </div>
      </main>

      {/* Phone-only action bar, pinned to the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-chalk/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        {toast && <p className="mb-2 text-center font-mono text-xs text-win">{toast}</p>}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="h-13 w-full rounded-md bg-plum text-[15px] font-semibold text-white transition-colors active:bg-plum-deep"
        >
          Log a set
        </button>
      </div>
    </div>
  );
}
