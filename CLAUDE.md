# House Tennis Ladder: notes for Claude Code

A Next.js app (App Router) that ranks a group's tennis sets with Elo. Data is in Upstash Redis on Vercel, or `.data/local-store.json` locally. See README.md.

## If the person wants to set it up

Run the `/setup` command (`.claude/commands/setup.md`): interview them, write `setup.json`, run `npm run setup -- --apply`, then walk them through Vercel. Assume they may never have used a terminal. Explain each step in one line before running it.

## Where personal choices live

- **Player names never go in committed files.** The starting roster is `NEXT_PUBLIC_LADDER_PLAYERS` (comma-separated) in `.env.local` locally and in Vercel's environment variables online. Both `.env.local` and `setup.json` are git-ignored. Don't hardcode names in `src/lib/types.ts`.
- `NEXT_PUBLIC_SET_LENGTH` (games to win a set, default 3) and `NEXT_PUBLIC_PLACEMENT_SETS` (sets before a newcomer is ranked, default 5). These are `NEXT_PUBLIC_` because the Elo math runs in the browser too, and Next.js bakes them in at build time, so changing them needs a redeploy.
- In the app, `/admin` (behind `ADMIN_PASSCODE`) adds, renames and removes players and edits matches. Players added there go through placement; the starting roster doesn't.

## Checks before calling anything done

- `npm run build` and `npm run lint`.
- `npm run dev`, log a set, and check `/admin` with the passcode in `.env.local`.
