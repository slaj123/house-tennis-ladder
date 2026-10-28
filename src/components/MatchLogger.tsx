"use client";

import { useState } from "react";
import type { Match, Player } from "@/lib/types";
import { DEFAULT_TARGET, MAX_TARGET, MIN_TARGET, scoreError } from "@/lib/scoring";

export interface SavedMatch {
  players: Player[];
  matches: Match[];
  match: Match;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "Something went wrong. Try again.";
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  big = false,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  big?: boolean;
}) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-md border border-line bg-paper font-mono text-xl text-ink transition-colors hover:border-ink active:bg-chalk disabled:opacity-30 disabled:hover:border-line";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`${label}: minus one`}
        className={btn}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      {big ? (
        <span
          className="flip-tile inline-flex h-12 w-10 items-center justify-center rounded-[3px] font-mono text-[28px] font-semibold tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
      ) : (
        <span className="w-7 text-center font-mono text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
      )}
      <button
        type="button"
        aria-label={`${label}: plus one`}
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

/**
 * Tap two players, bump their games won, save. The winner is whoever has more
 * games, so there's no separate "who won" step.
 */
export default function MatchLogger({
  players,
  flash,
  onSaved,
}: {
  players: Player[];
  flash: string;
  onSaved: (data: SavedMatch) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function togglePlayer(id: string) {
    setError("");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[0], id];
    });
  }

  const [aId, bId] = selected;
  const a = scores[aId] ?? 0;
  const b = scores[bId] ?? 0;
  const ready = selected.length === 2;
  const started = a > 0 || b > 0;
  const winnerId = a > b ? aId : bId;
  const loserId = a > b ? bId : aId;
  const winnerScore = Math.max(a, b);
  const loserScore = Math.min(a, b);
  const problem = ready && started ? scoreError(target, winnerScore, loserScore) : null;
  const canSave = ready && started && !submitting && problem === null;
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "";

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId, target, winnerScore, loserScore }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      onSaved((await res.json()) as SavedMatch);
      // Keep the same two players selected: a rematch is the most common next entry.
      setScores({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record match.");
    } finally {
      setSubmitting(false);
    }
  }

  const label = "font-mono text-[10px] uppercase tracking-[0.15em] text-muted";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={label}>Who played · tap two</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {players.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlayer(p.id)}
                aria-pressed={on}
                className={
                  "h-11 truncate rounded-md border px-2 text-sm font-semibold transition-colors " +
                  (on
                    ? "border-grass bg-grass text-on-grass"
                    : "border-line bg-paper text-ink hover:border-ink")
                }
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={label}>Set length</p>
          <p className="mt-0.5 text-sm">
            First to <span className="font-mono font-semibold">{target}</span>
          </p>
        </div>
        <Stepper
          label="First to"
          value={target}
          min={MIN_TARGET}
          max={MAX_TARGET}
          onChange={(t) => {
            setTarget(t);
            setError("");
          }}
        />
      </div>

      <div>
        <p className={label}>Games won</p>
        {ready ? (
          <div className="mt-2 flex flex-col gap-3">
            {selected.map((id) => (
              <div key={id} className="flex items-center justify-between gap-3">
                <span className="truncate font-display text-lg font-semibold">{name(id)}</span>
                <Stepper
                  big
                  label={`${name(id)} games`}
                  value={scores[id] ?? 0}
                  min={0}
                  max={target + 1}
                  onChange={(v) => {
                    setScores((prev) => ({ ...prev, [id]: v }));
                    setError("");
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Pick two players first.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="h-13 rounded-md bg-plum px-4 text-[15px] font-semibold text-white transition-colors hover:bg-plum-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
        >
          {submitting
            ? "Saving…"
            : canSave
              ? `Save · ${name(winnerId)} def. ${name(loserId)} ${winnerScore}-${loserScore}`
              : !ready
                ? "Pick two players"
                : "Enter games won"}
        </button>
        {problem && <p className="text-sm text-muted">{problem}</p>}
        {error && <p className="rounded-md bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>}
        {flash && !error && !problem && (
          <p className="rounded-md bg-win/10 px-3 py-2 font-mono text-xs text-win">{flash}</p>
        )}
      </div>
    </div>
  );
}
