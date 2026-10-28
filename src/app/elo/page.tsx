import {
  ELO_K,
  MOV_CAP,
  PLACEMENT_SETS,
  STARTING_ELO,
  eloDelta,
  expectedScore,
  lengthWeight,
  movMultiplier,
} from "@/lib/stats";
import { DEFAULT_TARGET } from "@/lib/scoring";
import { Card, PageHeader } from "@/components/ui";
import EloCalculator from "@/components/EloCalculator";

// [winner games, loser games, first to]
const MOV_EXAMPLES = [
  [3, 2, 3],
  [3, 1, 3],
  [3, 0, 3],
  [6, 4, 6],
  [7, 6, 6],
  [6, 0, 6],
] as const;

const LENGTH_EXAMPLES = [1, 2, 3, 4, 6, 8] as const;

const WORKED_WINNER_SCORE = 3;
const WORKED_LOSER_SCORE = 1;
const WORKED_TARGET = DEFAULT_TARGET;
const workedExpected = expectedScore(STARTING_ELO, STARTING_ELO);
const workedMov = movMultiplier(WORKED_WINNER_SCORE, WORKED_LOSER_SCORE, WORKED_TARGET);
const workedDelta = eloDelta(STARTING_ELO, STARTING_ELO, WORKED_WINNER_SCORE, WORKED_LOSER_SCORE, WORKED_TARGET);

const upsetWinner = 1400;
const upsetLoser = 1600;
const upsetExpected = expectedScore(upsetWinner, upsetLoser);
const upsetDelta = eloDelta(upsetWinner, upsetLoser, WORKED_WINNER_SCORE, WORKED_LOSER_SCORE, WORKED_TARGET);

export default function EloExplainerPage() {
  return (
    <div className="min-h-screen bg-chalk text-ink">
      <PageHeader
        width="max-w-3xl"
        eyebrow="Roommate Championships"
        title="How Elo Works"
        subtitle="The math behind the rankings, and how your rating moves after every set."
        nav={[{ href: "/", label: "← Ladder" }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-5">
          <Card title="The Basics">
            <p className="text-sm text-muted">
              Every player starts at <strong>{STARTING_ELO}</strong>. After each match, both
              players&apos; ratings shift by the same amount in opposite directions — the winner
              gains what the loser loses. Three things decide how big that shift is: how
              surprising the result was, how lopsided the set was, and how long the set was.
            </p>
          </Card>

          <Card title="New Players">
            <p className="text-sm text-muted">
              The founding six are ranked from day one. Anyone added later is{" "}
              <strong>unranked</strong> for their first {PLACEMENT_SETS} sets: they get a hidden
              rating that starts at {STARTING_ELO} and moves normally, but it isn&apos;t shown and
              they sit below the ladder. While they&apos;re placing in, a ranked opponent&apos;s
              rating is frozen: beating a newcomer earns nothing, losing to one costs nothing. After
              set {PLACEMENT_SETS}, their rating is revealed and they join the ladder.
            </p>
          </Card>

          <Card title="Step 1 — How Surprising Was It?">
            <p className="mb-3 text-sm text-muted">
              Before the match, the rating gap between the two players estimates the winner&apos;s
              odds of winning. If the ratings are equal, it&apos;s a coin flip.
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-chalk px-4 py-3 text-sm">
              expected = 1 / (1 + 10^((loser&apos;s Elo − winner&apos;s Elo) / 400))
            </pre>
            <p className="mt-3 text-sm text-muted">
              The lower the winner&apos;s expected chance was, the bigger the upset — and the bigger
              the rating swing.
            </p>
          </Card>

          <Card title="Step 2 — How Lopsided Was the Set?">
            <p className="mb-3 text-sm text-muted">
              A 3-2 set is a coin flip; a 3-0 set says one player is clearly better. The margin is
              measured as a share of the set length, so 3-0 in a first-to-3 counts the same as 6-0
              in a first-to-6. A shutout doubles the shift, the {MOV_CAP}× cap.
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-chalk px-4 py-3 text-sm">
              margin = 1 + (winner&apos;s games − loser&apos;s games) / first-to
            </pre>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-2 font-medium">Set</th>
                    <th className="py-2 pr-2 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {MOV_EXAMPLES.map(([w, l, t]) => (
                    <tr key={`${w}-${l}-${t}`} className="border-b border-line last:border-0">
                      <td className="py-2 pr-2">
                        {w}-{l} <span className="text-muted">first to {t}</span>
                      </td>
                      <td className="py-2 pr-2 text-right font-medium">{movMultiplier(w, l, t).toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Step 3 — How Long Was the Set?">
            <p className="mb-3 text-sm text-muted">
              A longer set gives luck less room, so it tells you more about who&apos;s better. The
              usual first-to-{DEFAULT_TARGET} counts 1×; longer sets count more, shorter ones less.
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-chalk px-4 py-3 text-sm">
              length = √(first-to / {DEFAULT_TARGET})
            </pre>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-2 font-medium">First to</th>
                    <th className="py-2 pr-2 text-right font-medium">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {LENGTH_EXAMPLES.map((t) => (
                    <tr key={t} className="border-b border-line last:border-0">
                      <td className="py-2 pr-2">{t}</td>
                      <td className="py-2 pr-2 text-right font-medium">{lengthWeight(t).toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Step 4 — Put It Together">
            <pre className="whitespace-pre-wrap break-words rounded-md bg-chalk px-4 py-3 text-sm">
              change = {ELO_K} × (1 − expected) × margin × length
            </pre>
            <p className="mt-3 text-sm text-muted">
              {ELO_K} is the &quot;K-factor&quot; — how fast ratings move for a group this size. The
              winner&apos;s rating goes up by that amount; the loser&apos;s goes down by the exact
              same amount.
            </p>
          </Card>

          <Card title="Worked Example">
            <p className="text-sm text-muted">
              Two {STARTING_ELO}-rated players play a first-to-{WORKED_TARGET} set and it ends{" "}
              {WORKED_WINNER_SCORE}-{WORKED_LOSER_SCORE}:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              <li>expected = {workedExpected.toFixed(2)} (equal ratings, coin flip)</li>
              <li>
                margin = 1 + {WORKED_WINNER_SCORE - WORKED_LOSER_SCORE}/{WORKED_TARGET} ={" "}
                {workedMov.toFixed(2)}×
              </li>
              <li>length = √({WORKED_TARGET}/{DEFAULT_TARGET}) = {lengthWeight(WORKED_TARGET).toFixed(2)}×</li>
              <li>
                change = {ELO_K} × (1 − {workedExpected.toFixed(2)}) × {workedMov.toFixed(2)} ×{" "}
                {lengthWeight(WORKED_TARGET).toFixed(2)} = {Math.round(workedDelta)}
              </li>
            </ul>
            <p className="mt-3 text-sm">
              Winner:{" "}
              <span className="font-medium text-win">
                {STARTING_ELO} → {Math.round(STARTING_ELO + workedDelta)} (+{Math.round(workedDelta)})
              </span>
              <br />
              Loser:{" "}
              <span className="font-medium text-loss">
                {STARTING_ELO} → {Math.round(STARTING_ELO - workedDelta)} (-{Math.round(workedDelta)})
              </span>
            </p>
          </Card>

          <Card title="Why Upsets Matter More">
            <p className="text-sm text-muted">
              If a {upsetWinner}-rated player beats a {upsetLoser}-rated player {WORKED_WINNER_SCORE}-
              {WORKED_LOSER_SCORE}, the winner was only expected to win{" "}
              {(upsetExpected * 100).toFixed(0)}% of the time — so the swing is much bigger:{" "}
              <strong>+{Math.round(upsetDelta)}</strong> instead of the {Math.round(workedDelta)} points
              an evenly-matched set would move. Beating someone better than you is worth far more
              than farming easy wins against someone worse.
            </p>
          </Card>

          <Card title="A Note on Edits">
            <p className="text-sm text-muted">
              Ratings aren&apos;t stored — they&apos;re recalculated from the entire match history
              every time the page loads, in the order matches were played. That&apos;s why editing or
              undoing an old match in the admin panel correctly ripples through every rating after
              it, instead of leaving things out of sync.
            </p>
          </Card>

          <EloCalculator />
        </div>
      </div>
    </div>
  );
}
