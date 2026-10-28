---
description: Set up your group's tennis ladder and put it on Vercel
---

Walk the person through setting up their ladder. One step at a time, say what each step does in one plain sentence, and wait for them before moving on. Define technical words the first time.

1. **Check tools.** `node --version` (20 or newer). If `node_modules/` is missing, run `npm install`.

2. **Interview them**, one question at a time:
   - Who's in the group from the start (at least two names). These players are ranked from day one.
   - How many games win a set (default 3, from 1 to 10).
   - How many sets a newcomer plays before being ranked (default 5).

3. **Write `setup.json`**: `{ "players": ["..."], "setLength": 3, "placementSets": 5 }`. Confirm it with them. It's git-ignored.

4. **Apply:** `npm run setup -- --apply`. It writes `.env.local` (git-ignored) with the roster, the rules and a random local admin passcode, and prints the values for Vercel. Don't repeat the passcode in chat.

5. **Try it:** `npm run dev`, open http://localhost:3000, log a set, and open `/admin`.

6. **Put it online** (when they say go), following README.md "Put it online":
   - Push their copy to GitHub.
   - Import it in Vercel.
   - Add Upstash Redis under Storage.
   - Add the environment variables setup printed, plus their own `ADMIN_PASSCODE`.
   - Redeploy.

   Explain that changing the roster or rules later means editing those variables in Vercel and redeploying.

End with three lines: the live URL, where to add players later (`/admin`), and how to change rules (Vercel variables, then redeploy).
