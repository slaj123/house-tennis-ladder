import Link from "next/link";
import { formatDate } from "@/lib/format";
import { DEFAULT_TARGET } from "@/lib/scoring";

/** Chalk court markings, drawn from above, faded behind the header. */
function CourtLines() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full text-on-grass opacity-[0.22]"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke">
        <rect x="12" y="14" width="376" height="172" />
        <line x1="12" y1="36" x2="388" y2="36" />
        <line x1="12" y1="164" x2="388" y2="164" />
        <line x1="104" y1="36" x2="104" y2="164" />
        <line x1="296" y1="36" x2="296" y2="164" />
        <line x1="104" y1="100" x2="296" y2="100" />
        <line x1="200" y1="14" x2="200" y2="186" strokeDasharray="3 5" />
      </g>
    </svg>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  nav,
  width = "max-w-6xl",
  children,
}: {
  width?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  nav?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <header className="mown-grass relative overflow-hidden border-b-[6px] border-plum text-on-grass">
      <CourtLines />
      <div className={`relative mx-auto ${width} px-4 pb-7 pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] sm:px-6 lg:px-8 lg:pb-10 lg:pt-8`}>
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-[11px] uppercase whitespace-nowrap tracking-[0.08em] text-on-grass/70 sm:tracking-[0.2em]">{eyebrow}</p>
          {nav && (
            <nav className="flex shrink-0 gap-3 sm:gap-4">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-grass/80 underline sm:tracking-[0.15em] decoration-on-grass/30 underline-offset-4 hover:text-on-grass hover:decoration-on-grass"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-on-grass/75">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}

/** Divider with a center tick, like the center mark on a baseline. */
export function CenterMark() {
  return (
    <div aria-hidden className="relative my-3 h-px bg-line">
      <span className="absolute left-1/2 top-[-4px] h-[9px] w-px -translate-x-1/2 bg-muted" />
    </div>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-line bg-paper p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight text-plum">{title}</h2>
        {action}
      </div>
      <CenterMark />
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "win" | "loss";
}) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-paper px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{label}</p>
      <p
        className={
          "mt-1 truncate font-mono text-base font-semibold sm:text-lg " +
          (accent === "win" ? "text-win" : accent === "loss" ? "text-loss" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function StreakBadge({ streak }: { streak: { type: "W" | "L"; count: number } | null }) {
  if (!streak || streak.count === 0) {
    return <span className="w-8 text-center font-mono text-xs text-muted">—</span>;
  }
  const isWin = streak.type === "W";
  return (
    <span
      className={
        "inline-flex w-8 justify-center rounded-sm py-0.5 font-mono text-xs font-semibold " +
        (isWin ? "bg-win/12 text-win" : "bg-loss/12 text-loss")
      }
    >
      {streak.type}
      {streak.count}
    </span>
  );
}

/** Scoreboard flip tiles for a set score. */
export function ScoreTiles({
  winner,
  loser,
  size = "sm",
}: {
  winner: number;
  loser: number;
  size?: "sm" | "lg";
}) {
  const tile =
    "flip-tile inline-flex items-center justify-center rounded-[3px] font-mono font-semibold tabular-nums " +
    (size === "lg" ? "h-12 w-10 text-[28px]" : "h-7 w-6 text-sm");
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${winner} to ${loser}`}>
      <span className={tile}>{winner}</span>
      <span className={tile}>{loser}</span>
    </span>
  );
}

export function MatchRow({
  winnerName,
  loserName,
  winnerScore,
  loserScore,
  target,
  playedAt,
  delta,
}: {
  winnerName: string;
  loserName: string;
  winnerScore: number;
  loserScore: number;
  target: number;
  playedAt: string;
  /** Elo change label, e.g. "±14", or "+14 / 0" when one side was frozen. */
  delta: string | null;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <ScoreTiles winner={winnerScore} loser={loserScore} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-semibold">{winnerName}</span>
          <span className="text-muted"> def. </span>
          {loserName}
        </p>
        <p className="font-mono text-[11px] text-muted">
          {formatDate(playedAt)}
          {target !== DEFAULT_TARGET && ` · first to ${target}`}
        </p>
      </div>
      {delta !== null && (
        <span className="shrink-0 font-mono text-xs text-muted" title="Elo change">
          {delta}
        </span>
      )}
    </li>
  );
}
