# House Tennis Ladder

A small web app for ranking a group of friends who play tennis together. Anyone can log a set from their phone, and the app keeps an Elo ranking, head-to-head records and full match history.

- **Elo ratings.** Everyone starts at 1500. Each set moves ratings by up to 32 points, with a small bonus for a lopsided score.
- **Fair placement.** The players you start with are ranked from day one. Anyone added later stays "unranked" until they have played 5 sets.
- **Short sets.** A set is first to 3 games by default (1 to 10 allowed), with a one-game extension at deuce.
- **Admin page.** At `/admin`, behind a passcode, you can add, rename or remove players, edit or delete matches, and reset the ladder.
- **Elo explainer.** `/elo` shows how a single result changes two ratings.

Built with Next.js, React and Tailwind. Data lives in Upstash Redis (free tier is plenty). Hosted on Vercel.

## What you need

- [Node.js](https://nodejs.org) 20 or newer
- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account (sign in with GitHub)

## 1. Run it on your computer

```bash
git clone https://github.com/<your-username>/house-tennis-ladder.git
cd house-tennis-ladder
npm install
```

Then set up your group:

```bash
npm run setup
```

It asks who's in your group from the start, how many games win a set, and how many sets a newcomer plays before being ranked. It writes everything to `.env.local` (git-ignored), including a random local admin passcode. **Your friends' names never go into the code or the repo.** It also prints the same settings to paste into Vercel later.

```bash
npm run dev
```

Open http://localhost:3000. Without a database, the app saves to `.data/local-store.json` on your computer (git-ignored), so you can try everything first. If you change the roster after trying it, delete that file so it reloads.

**Set up with Claude Code:** open this folder in [Claude Code](https://claude.com/claude-code) and type `/setup`. It asks the same questions in conversation, applies them, and walks you through Vercel.

## 2. Players later on

- **In the app:** `/admin` adds, renames or removes players and edits matches. People added there play the placement sets before they're ranked.
- **The starting roster and rules** live in environment variables: `NEXT_PUBLIC_LADDER_PLAYERS`, `NEXT_PUBLIC_SET_LENGTH`, `NEXT_PUBLIC_PLACEMENT_SETS`. To change them, rerun `npm run setup` locally, or edit them in Vercel and redeploy.

## 3. Put it online

1. Push your copy to GitHub.
2. In Vercel, click **Add New → Project**, pick the repo, and click **Deploy**. The first deploy works but saves nothing yet.
3. In the Vercel project, open **Storage → Create Database → Upstash for Redis** (free plan) and connect it to the project. Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables for you.
4. In **Settings → Environment Variables**, add `ADMIN_PASSCODE` (a long passcode only you know) and the three `NEXT_PUBLIC_` values `npm run setup` printed.
5. Go to **Deployments**, open the latest one, and click **Redeploy** so it picks up the new variables.

Share the URL with your group. On iPhone, open it in Safari, tap Share, then **Add to Home Screen** to use it like an app.

## Settings you can change

| What | Where | Default |
| --- | --- | --- |
| Starting rating | `STARTING_ELO` in `src/lib/stats.ts` | 1500 |
| Starting roster | `NEXT_PUBLIC_LADDER_PLAYERS` | 6 sample names |
| How fast ratings move | `ELO_K` in `src/lib/stats.ts` | 32 |
| Sets before a newcomer is ranked | `NEXT_PUBLIC_PLACEMENT_SETS` | 5 |
| Games to win a set | `NEXT_PUBLIC_SET_LENGTH` | 3 |

## Security notes

- Anyone with the link can log matches. Only `/admin` is locked.
- Match logging is rate-limited per IP address, and the admin session cookie is HTTP-only.
- Never commit `.env.local`. Keep real values in Vercel's environment variables.

## License

MIT. See `LICENSE`.
