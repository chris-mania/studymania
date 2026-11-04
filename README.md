# Study Mania

Live at **https://studymania.app**. Turn class notes into daily bite-size lessons so you never cram.

How it works for a student:
1. Create an account (syncs between phone and computer) or use it without one (saved on that device only).
2. Add a subject and pick a plan: an exam date with review days before it, "finish in N days", or no deadline. Adding notes chapter by chapter? Turn on "adding notes as I go".
3. Copy the Study Mania prompt, paste it with your notes or slides into any AI (ChatGPT, Claude, Gemini, Grok), and paste the AI's reply back. You get cards (textbook definition, plain-words meaning, real-world example, memory trick, near-miss quiz answers) and exam-style questions.
4. Do a lesson or two a day. Words come back in spaced reviews. Take practice exams. Streaks, XP, a daily-goal ring, confetti and one reminder a day keep you coming back.

Runs on Cloudflare: a Worker for the API, D1 (SQLite) for the database, and static files for the app. No framework, no build step. Free tier is plenty to start.

---

## Deploy to Cloudflare Pages  →  https://studymania.app (also studymania.pages.dev)

The app runs on **Cloudflare Pages** (the site + API), plus one tiny **Worker** that only sends the daily reminders, because Pages can't run on a schedule. Both use the same D1 database.

### First time ever (fresh setup)
```bash
npm install
npx wrangler login
npx wrangler d1 create studymania          # paste the database_id into wrangler.toml AND reminders.toml
npx wrangler d1 execute studymania --remote --file=schema.sql
node scripts/gen-vapid.mjs                 # paste the public key + your email into wrangler.toml AND reminders.toml
npx wrangler pages deploy                  # say yes to creating the project, name it studymania, branch main
npx wrangler pages secret put VAPID_PRIVATE_JWK --project-name studymania   # paste the {"d":...} line
npx wrangler deploy -c reminders.toml
npx wrangler secret put VAPID_PRIVATE_JWK -c reminders.toml                 # paste the same {"d":...} line
npx wrangler pages deploy                  # once more, so the secret is picked up
```

### Moving from the old workers.dev version (keeps every account)
1. Before replacing the folder, open your **old** `wrangler.toml` and copy three things: `database_id`, `VAPID_PUBLIC_KEY`, and your `VAPID_SUBJECT` email.
2. Unzip the new version. Paste those three values into **both** `wrangler.toml` and `reminders.toml`.
3. In Terminal, inside the folder: `npm install`
4. Upgrade the database (adds usernames, streak freezes and pair cards, and keeps all data):
   `npx wrangler d1 execute studymania --remote --file=migrations/0003_usernames_leaderboard.sql`
5. Continue from `npx wrangler pages deploy` in the list above.
6. Lost the `{"d":...}` private key? Run `node scripts/gen-vapid.mjs` again, put the **new** public key in both toml files, and use the new private key. Then turn reminders off and on again in the app.
7. Once `studymania.pages.dev` works, delete the old Worker: Cloudflare dashboard → Workers & Pages → the old `studymania` Worker → Settings → Delete. The database is separate and stays.
8. On your phone: remove the old home screen icon, open `studymania.pages.dev` in Safari, sign in, add it to your home screen, and turn on reminders.

### Updating later
```bash
npx wrangler pages deploy                  # the app
npx wrangler deploy -c reminders.toml      # only if reminder code changed
```

### Optional: "Email me a reset link" for forgotten passwords

Security questions work with no setup. To also offer email reset links:
1. Make a free account at https://resend.com, add and verify your domain (it walks you through adding a few DNS records in Cloudflare), and create an API key.
2. In `wrangler.toml` under `[vars]`, add: `EMAIL_FROM = "Study Mania <hello@yourdomain.com>"`
3. Run `npx wrangler pages secret put RESEND_API_KEY --project-name studymania`, paste the key, then `npx wrangler pages deploy`.

The "Email me a reset link" button shows up automatically once the key is set. Links last 30 minutes, and resetting a password signs that account out everywhere else.

**Custom domain (optional):** Cloudflare dashboard → Workers & Pages → studymania (Pages) → Custom domains.

**Database changes:** once people have accounts, never re-create tables. New columns come as files in `migrations/`, run once with `npx wrangler d1 execute studymania --remote --file=migrations/<file>.sql`.

---

## Try it on your computer first (optional)

```bash
npx wrangler d1 execute studymania --local --file=schema.sql
npx wrangler pages dev
```
Open http://localhost:8787 after `npx wrangler pages dev`. (There's also `npm run local`, a no-install stand-in that uses Node's built-in SQLite. That's what this was tested with.)

---

## What's where

| File | What it does |
|---|---|
| `public/index.html`, `app.js`, `styles.css` | The app screens |
| `public/shared.mjs` | Lesson grouping, daily plan math and spaced review. Shared by the app, the server and no-account mode. |
| `public/local.mjs` | No-account mode: same features, stored in the browser |
| `public/prompt.js` | **The prompt students copy into their AI.** Edit this to change how cards get written. |
| `public/sw.js` | Offline support + the daily notification |
| `public/sample.json` | The sample subject (your Peavey Ch. 4–6 deck + 10 exam questions) |
| `src/worker.js` | API: accounts, password recovery, subjects, progress, practice exams, guest import, reminders (hourly cron) |
| `functions/api/[[path]].js` | Hooks the API into Cloudflare Pages |
| `src/reminders.js` + `reminders.toml` | The tiny Worker that sends reminders every hour |
| `migrations/` | Database upgrades for an app that already has users |
| `src/webpush.js` | Sends push notifications |
| `schema.sql` | Database tables |
| `examples/peavey-scm-midterm.json` | Your Peavey deck in the paste-in format |

### How the plan works
- **Exam date:** new lessons are spread over the days before your review days, so with an exam on the 20th and 3 review days, you finish lessons by the 16th. Review days have no new lessons, just reviews and practice exams.
- **Finish in N days:** lessons ÷ days. Change it anytime (5, 10, 15, 30 or any number).
- **No deadline:** one at a time, showing the date you'd finish at 1 a day.
- **Adding notes as I go:** every batch of notes you paste gets its own short deadline ("learn each batch within 3 days"). If there's also an exam date, everything still finishes before review days. Lessons are grouped by batch on the subject page.
- The daily number is worked out from the start of the day, so it doesn't jump around while you study. You can always do more lessons and finish early.

### Streaks, leaderboard, quitting
- A round counts toward the streak and daily goal when you finish it, or quit after getting 80% through. Quitting earlier still saves every answer, and lessons resume where you left off.
- Streak freezes: earn 1 for every 7 days in a row, hold up to 2. One gets used automatically for each missed day.
- Everyone picks a username at signup (older accounts get asked once) and can sign in with it or their email. The leaderboard shows this week's XP (resets Monday) and current streaks, and anyone can hide themselves in Settings.
- Lessons include 3 throwbacks: older words, with missed and overdue ones first plus one you already know well. With an exam date, every learned word comes back in the last few days before it (the final sweep). New lessons are capped at 4 a day, even when you're behind.
- The prompt pairs small look-alike terms ("Groupthink vs. Social Loafing") into one card, quizzed with a scenario.

### How the studying works
- **Lessons:** cards grouped by topic, 3–5 per lesson. Each word: teach (plain meaning, textbook definition, real-world example, memory trick, "don't mix up", related words) → quick check (word → meaning, with near-miss wrong answers) → recap at the end (meaning → word). Miss one and it gets re-taught and re-asked a few steps later.
- **Spaced review:** each word has a level 0–5. Right answers push the next review out (1, 2, 4, 8, 16 days), and a miss brings it back tomorrow.
- **Practice exam:** 10–50 questions mixing the AI's exam-style scenario questions with questions built from your cards (meaning, term, true/false). Optional timer (1 min per question). No hints until the end, then score, by-topic breakdown, every miss explained, and "Study the words you missed". Missed words come back in reviews. Scores are kept per subject.
- **Rewards:** 10 XP per right answer, +20 for finishing a lesson, +10 for a perfect round, 5 XP per right exam answer. The streak counts days with at least one round. The daily goal ring fills up, with confetti when it's done.
- **Offline (account mode):** a round finished with no signal saves on the phone and syncs later.

### No-account mode
- Everything lives in the browser's storage on that device. The app warns clearly that it's this device and browser only, not to use private/incognito, to add it to the home screen first (on iPhone the home screen app and Safari keep separate data), and that clearing browser data erases it. No reminders.
- "Create an account" moves all subjects, progress, streak, XP and exam scores into the new account. Signing in to an existing account offers to bring them over.

### Security notes
- Passwords and security answers are hashed (PBKDF2, 100k rounds, per-user salt). Answers ignore capital letters, spaces and punctuation.
- Recovery locks for 1 hour after 5 wrong tries. A password reset signs the account out everywhere.
- Sessions are random tokens in HttpOnly cookies, stored hashed. Each person can only read and change their own subjects.
- Security questions are easier to guess than an email link. Encourage email reset once you set up Resend.
- Before you go big: add a rate-limiting rule on `/api/login` and `/api/recover/*` (Cloudflare dashboard → Security → WAF → Rate limiting).

### Ideas for next
- Friends / weekly XP leaderboard
- Streak freeze earned with XP
- Share a subject with classmates
- Built-in AI (upload a PDF, no copy-paste). Costs money per use, so maybe a paid tier.
