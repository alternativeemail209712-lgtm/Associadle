# Category Connect Live — Complete Setup Guide (No Coding Required)

This guide assumes you have never touched code before. Just follow every step in order.

## What is this game?

Your audience sees a grid of words, each in its own numbered box — just like a chessboard, every
box has a coordinate such as `B3` (column letter + row number). Hidden inside the grid are groups
of 4 boxes that share a secret category (e.g. the boxes holding `NEWTON`, `TESLA`, `DARWIN`, and
`EINSTEIN` are all **Famous Scientists**).

**To win a category, one viewer must type all 4 correct coordinates in a single chat message** —
for example `A1 B2 C3 D4`. Chat can discuss and figure it out together, but only the person who
locks in the complete, correct set of 4 coordinates in one message gets the points. This keeps
answering fast, unambiguous, and very easy to do from a phone keyboard — no spelling out full
words required.

---

## PART 1 — What you were given

```
associadle-live/
├── package.json          <- tells the server what software libraries it needs
├── server.js               <- the "brain" of the game (backend)
├── words.js                <- the puzzle bank (edit anytime to add your own puzzles)
├── .gitignore
├── DEPLOYMENT_GUIDE.md    <- this file
└── public/
    └── index.html          <- the screen you and your audience will see (frontend)
```

You will never need to open or understand the code inside these files. You only need to
upload them exactly as they are.

---

## PART 2 — Get a TikTok signing key (required for Live connection)

TikTok requires a "signing key" for any tool that reads live chat. There is no way around this —
it's a TikTok requirement, not something this app can bypass.

1. Go to **https://www.eulerstream.com**
2. Create a free account.
3. On your dashboard, copy your **API Key**.
4. Save it somewhere safe — you'll paste it into the game's Settings panel later.

You do **not** need this key to test the game or play solo — only to pull in real TikTok chat.

---

## PART 3 — Put the project on GitHub (no commands needed)

1. Go to **https://github.com** and create a free account if you don't have one.
2. Click the **+** icon (top-right) → **New repository**. Name it `associadle-live` (or
   anything). Click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Drag every file **and the whole `public` folder** from your computer into the upload box.
5. Scroll down and click **Commit changes**.
6. Confirm you now see: `package.json`, `server.js`, `words.js`, `.gitignore`,
   `DEPLOYMENT_GUIDE.md`, and a `public` folder containing `index.html`.

---

## PART 4 — Deploy to Render.com

1. Go to **https://render.com**, create a free account (signing up with GitHub is easiest).
2. Click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository**, connect GitHub if asked, and pick your
   `associadle-live` repository.
4. Fill in:
   - **Name**: anything, e.g. `associadle-live`
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (fine for testing; consider a paid tier for a real broadcast so
     the server doesn't fall asleep from inactivity)
5. Click **Create Web Service** and wait 2–5 minutes for the build to finish.
6. Open the URL shown at the top of the Render page — you should see the game.

**That's it — the game is live on the internet, ready to broadcast from your phone.**

---

## PART 5 — Using the game

The screen you see is what your audience should see (screen-share it or point a camera at it).
Every host/setup control lives behind the **⚙️ gear icon** in the top-right corner, so the
broadcast view itself always stays clean.

### Try it out first (Manual Composer — no TikTok needed)
1. Tap **⚙️** to open Settings.
2. Open **🧩 Puzzle Controls** → pick a puzzle (or leave "Random Puzzle") → tap **🆕 New Puzzle**.
3. Open **🧪 Manual Composer & Testing**.
   - Tap **🎲 Simulate Random Attempt** repeatedly to watch real attempts play out.
   - Tap **▶ Auto-Sim** to have attempts fire automatically every couple seconds.
   - Or type your own name + a guess like `A1 B2 C3 D4` and tap **Send** — this is also how you
     can play completely offline/solo.

### Go live with real TikTok chat
1. Open **📡 TikTok Live Connection** in Settings.
2. Type your TikTok username with **no @ symbol**.
3. Paste your Eulerstream signing key.
4. Tap **Connect** — the status box should turn to "Connected."
5. Start your TikTok LIVE as normal, close the Settings drawer, and start a puzzle.
6. Tell your audience: *"Find 4 boxes that go together and type all 4 coordinates in ONE
   comment, like A1 B2 C3 D4, to win that group!"*

### Settings panel sections
- **📡 TikTok Live Connection** — connect/disconnect, live status.
- **🧩 Puzzle Controls** — pick/start a puzzle, reveal a hint (shows one hidden category's
  *name* only, never its words), or reveal all remaining answers to end a round early.
- **🎚️ Difficulty** — Strict Mode toggle. OFF (default) means wrong attempts are simply
  ignored, so the game never stalls from chat noise. ON adds classic 4-lives pressure.
- **🧪 Manual Composer & Testing** — type any message as if it were chat; quick random-attempt
  simulator and auto-sim for testing.
- **📊 Diagnostics** — raw event counter and last-received message, so you can confirm real
  chat is reaching the server without ever needing to check server logs.

---

## PART 6 — Adding your own puzzles (optional, no coding needed)

1. On GitHub, open `words.js` and click the pencil (✏️) icon to edit.
2. Copy one of the existing puzzle blocks, for example:
   ```
   {
     title: "General Knowledge",
     categories: [
       { name: "FAMOUS SCIENTISTS", words: ["NEWTON", "TESLA", "DARWIN", "EINSTEIN"] },
       ...
     ]
   }
   ```
3. Change the `title`, category `name`s, and `words` (always exactly 4 words per category, never
   repeated within the same puzzle). Add your new block inside the `PUZZLES` array.
4. Click **Commit changes** — Render redeploys automatically within a minute or two.
   Coordinates (like `A1`) are generated automatically every round — you never assign them
   yourself.

---

## PART 7 — Troubleshooting

- **"Failed to connect after 3 attempts"** — confirm the TikTok username has no `@`/spaces, the
  account is actually live right now, and your Eulerstream key has no extra spaces.
- **Nothing happens when chat types coordinates** — make sure a puzzle is active (Settings →
  New Puzzle first). A message needs all 4 coordinates in one go, e.g. `A1 B2 C3 D4` — three or
  fewer is not counted as an attempt.
- **The leaderboard reset after redeploying** — expected on Render's free tier; scores persist
  normally throughout a broadcast, they just reset when the server restarts on redeploy.
- **The server crashed** — it shouldn't: every handler and the TikTok connection are wrapped in
  error protection, and uncaught exceptions/unhandled rejections are caught server-wide so one
  bad comment can never take the whole game down.

You're all set — enjoy running Category Connect Live!
