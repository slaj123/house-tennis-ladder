"use client";

import { useState } from "react";
import { eloDelta, expectedScore, lengthWeight, movMultiplier } from "@/lib/stats";
import { scoreError } from "@/lib/scoring";
import { Card } from "@/components/ui";

export default function EloCalculator() {
  const [winnerElo, setWinnerElo] = useState("1500");
  const [loserElo, setLoserElo] = useState("1500");
  const [winnerScore, setWinnerScore] = useState("3");
  const [loserScore, setLoserScore] = useState("1");
  const [target, setTarget] = useState("3");

  const w = Number(winnerElo);
  const l = Number(loserElo);
  const ws = Number(winnerScore);
  const ls = Number(loserScore);
  const t = Number(target);
  const problem =
    !Number.isFinite(w) || !Number.isFinite(l) ? "Enter both Elo ratings." : scoreError(t, ws, ls);
  const valid = problem === null;

  const expected = valid ? expectedScore(w, l) : null;
  const mov = valid ? movMultiplier(ws, ls, t) * lengthWeight(t) : null;
  const delta = valid ? eloDelta(w, l, ws, ls, t) : null;

  return (
    <Card title="Try It Yourself">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          Winner&apos;s Elo
          <input
            type="number"
            value={winnerElo}
            onChange={(e) => setWinnerElo(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-plum"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Loser&apos;s Elo
          <input
            type="number"
            value={loserElo}
            onChange={(e) => setLoserElo(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-plum"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Winner&apos;s Games
          <input
            type="number"
            value={winnerScore}
            onChange={(e) => setWinnerScore(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-plum"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Loser&apos;s Games
          <input
            type="number"
            value={loserScore}
            onChange={(e) => setLoserScore(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-plum"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          First To
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-plum"
          />
        </label>
      </div>

      {!valid ? (
        <p className="mt-4 text-sm text-loss">
          {problem}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-chalk p-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              Expected Win Chance
            </p>
            <p className="mt-1 text-lg font-semibold">{(expected! * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-md bg-chalk p-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              Margin × Length
            </p>
            <p className="mt-1 text-lg font-semibold">{mov!.toFixed(2)}×</p>
          </div>
          <div className="rounded-md bg-chalk p-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              Rating Change
            </p>
            <p className="mt-1 text-lg font-semibold">
              <span className="text-win">+{Math.round(delta!)}</span>
              {" / "}
              <span className="text-loss">-{Math.round(delta!)}</span>
            </p>
          </div>
        </div>
      )}
      {valid && (
        <p className="mt-3 text-sm text-muted">
          Winner: {w} → {Math.round(w + delta!)} · Loser: {l} → {Math.round(l - delta!)}
        </p>
      )}
    </Card>
  );
}
