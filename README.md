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

Create a file named `.env.local` in the project folder with one line:

```
ADMIN_PASSCODE=pick-a-long-passcode
```

Then start it:

```bash
npm run dev
```

Open http://localhost:3000. Without a database configured, the app saves to `.data/local-store.json` on your computer, so you can try everything first. Both `.env.local` and `.data/` are git-ignored.

## 2. Add your players

Open `src/lib/types.ts` and replace the sample names in `INITIAL_PLAYERS`:

```ts
export const INITIAL_PLAYERS: Player[] = [
  { id: "alex", name: "Alex" },
  ...
];
```

- `id` is permanent: lowercase letters, no spaces.
- `name` is what shows on screen, and you can change it later in `/admin`.
- These players are your "core" group and are ranked immediately. Players added later in `/admin` have to play 5 sets first.

If you already ran the app locally, delete `.data/local-store.json` so it reloads the new roster.

## 3. Put it online

1. Push your copy to GitHub.
2. In Vercel, click **Add New → Project**, pick the repo, and click **Deploy**. The first deploy works but saves nothing yet.
3. In the Vercel project, open **Storage → Create Database → Upstash for Redis** (free plan) and connect it to the project. Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables for you.
4. In **Settings → Environment Variables**, add `ADMIN_PASSCODE` with a long passcode only you know.
5. Go to **Deployments**, open the latest one, and click **Redeploy** so it picks up the new variables.

Share the URL with your group. On iPhone, open it in Safari, tap Share, then **Add to Home Screen** to use it like an app.

## Settings you can change

| What | Where | Default |
| --- | --- | --- |
| Starting rating | `STARTING_ELO` in `src/lib/stats.ts` | 1500 |
| How fast ratings move | `ELO_K` in `src/lib/stats.ts` | 32 |
| Sets before a newcomer is ranked | `PLACEMENT_SETS` in `src/lib/stats.ts` | 5 |
| Games to win a set | `DEFAULT_TARGET` in `src/lib/scoring.ts` | 3 |

## Security notes

- Anyone with the link can log matches. Only `/admin` is locked.
- Match logging is rate-limited per IP address, and the admin session cookie is HTTP-only.
- Never commit `.env.local`. Keep real values in Vercel's environment variables.

## License

MIT. See `LICENSE`.
