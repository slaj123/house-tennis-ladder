// npm run setup: your roster and house rules.
// Writes setup.json (your answers) and .env.local; both are git-ignored, so names stay out of the repo.
// Prints the same settings to paste into Vercel. `npm run setup -- --apply` skips the questions.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { APPLY_ONLY, loadSetup, saveSetup, askList, askNumber, done } from "./lib/setup-kit.mjs";

const s = loadSetup("setup.json", { players: ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley"], setLength: 3, placementSets: 5 });

if (!APPLY_ONLY) {
  console.log("Tennis Ladder setup. Press Enter to keep the value in [brackets].\n");
  for (;;) {
    s.players = await askList("Your starting players (ranked from day one)", s.players);
    if (s.players.length >= 2) break;
    console.log("  A ladder needs at least two players.");
  }
  s.setLength = await askNumber("Games to win a set (first to...)", s.setLength, { min: 1, max: 10 });
  s.placementSets = await askNumber("Sets a newcomer plays before they're ranked", s.placementSets, { min: 1, max: 20 });
  saveSetup("setup.json", s);
}
done();

// Names go in one comma-separated value, so commas inside a name can't be used.
const players = s.players.map((n) => n.replace(/,/g, " ").trim()).filter(Boolean);
if (players.length < 2) { console.error("Setup needs at least two players."); process.exit(1); }
const vars = {
  NEXT_PUBLIC_LADDER_PLAYERS: players.join(","),
  NEXT_PUBLIC_SET_LENGTH: String(s.setLength),
  NEXT_PUBLIC_PLACEMENT_SETS: String(s.placementSets),
};

// Keep everything else already in .env.local (your ADMIN_PASSCODE, database keys).
const env = existsSync(".env.local")
  ? Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]))
  : {};
let made = false;
if (!env.ADMIN_PASSCODE) { env.ADMIN_PASSCODE = randomBytes(12).toString("base64url"); made = true; }
Object.assign(env, vars);
writeFileSync(".env.local", Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
console.log("Wrote .env.local (git-ignored).");
if (made) console.log(`Your LOCAL admin passcode is: ${env.ADMIN_PASSCODE}`);

console.log("\nIn Vercel (Settings, then Environment Variables), add these, then redeploy:");
for (const [k, v] of Object.entries(vars)) console.log(`  ${k} = ${v}`);
console.log("  ADMIN_PASSCODE = (a long passcode only you know)");
console.log("\nRun `npm run dev` and open http://localhost:3000. Add or rename players later at /admin.");
console.log("If you already tried the app locally, delete .data/local-store.json so it loads the new roster.");
