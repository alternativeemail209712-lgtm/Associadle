# Category Connect Live — Complete Setup Guide (No Coding Required)

This guide assumes you have never touched code before. Just follow every step in order.

## What is this game?

Your audience sees a grid of words. Hidden inside are groups of 4 words that share a secret
category (e.g. `NEWTON`, `TESLA`, `DARWIN`, `EINSTEIN` are all **Famous Scientists**). Anyone
watching your TikTok LIVE just types **one word they see on the board** into your chat. If it
fits the group currently being built, it locks in with a glow. Get all 4 matching words and the
whole category flips into a colored bar with confetti — then the crowd moves on to the next
group. It's collaborative: many different viewers can contribute words to the same win.

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

## PART 2 — Get a TikTok signing key (required for Live Mode)

TikTok requires a "signing key" for any tool that reads live chat. There is no reliable way
around this — it's a TikTok requirement, not something this app can bypass.

1. Go to **https://www.eulerstream.com**
2. Create a free account.
3. On your dashboard, copy your **API Key** (a long string of letters and numbers).
4. Save it somewhere safe — you'll paste it into the game later.

You do **not** need this key for Test Mode or Offline Mode.

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
6. Open the URL shown at the top of the Render page (e.g.
   `https://associadle-live.onrender.com`) — you should see the game.

**That's it — the game is live on the internet, ready to broadcast from your phone.**

---

## PART 5 — Using the game

### Test Mode (try it out safely, no TikTok needed)
1. Tap **🧪 Test Mode**.
2. In Host Controls, pick a puzzle (or leave "Random Puzzle") and tap **🆕 New Puzzle**.
3. Tap **🎲 Simulate Random Fake Chat** repeatedly, or type your own fake username/word.
4. Tap **▶ Auto-Simulate** to have fake guesses appear automatically every few seconds so you
   can watch a full puzzle solve itself.

### Offline Mode (play solo)
1. Tap **🎮 Offline Mode**, start a puzzle, and type words you spot on the board yourself.

### Live Mode (real TikTok broadcast)
1. Tap **📡 Live Mode**.
2. Type your TikTok username with **no @ symbol**.
3. Paste your Eulerstream signing key.
4. Tap **Connect to TikTok LIVE** — the status box should turn green/"Connected".
5. Start your TikTok LIVE as normal, point your phone/screen-share at this page, and tap
   **🆕 New Puzzle** in Host Controls.
6. Tell your audience: *"Type any word you see on the board in the chat to try to build a
   group of 4!"*

### Host Controls (always available, any mode)
- **Puzzle dropdown + New Puzzle**: pick a specific puzzle or a random one.
- **Hint**: reveals the *name* of one hidden category (not its words) to nudge the crowd.
- **Clear Selection**: wipes the group currently being built, without penalty — useful if chat
  gets stuck on a wrong path.
- **Reveal All**: ends the puzzle immediately and shows every remaining group.
- **Strict (4 lives) toggle**: when ON, a wrong guess costs a life (like the classic version of
  this game) and 4 wrong guesses ends the puzzle. Leave it OFF for a relaxed, always-flowing
  live-stream experience — wrong guesses are just ignored so chat noise never breaks progress.
- **Manual comment box**: type anything as if it were a chat message — handy for testing or for
  seeding the first word yourself to get things going.

### On-screen diagnostics (bottom of the screen)
- **EVENTS**: increases every time any message arrives, from any source. If this never moves
  while live, TikTok messages aren't reaching the server — check your username/key.
- **LAST**: the very last username + message text received, so you can confirm real comments
  are getting through.
- **TIKTOK**: current connection status (`connected`, `connecting`, `retrying`, `error`,
  `disconnected`).

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
3. Change the `title`, category `name`s, and `words` (always exactly 4 words per category, and
   never repeat a word within the same puzzle). Add your new block inside the `PUZZLES` array.
4. Click **Commit changes** — Render redeploys automatically within a minute or two.

---

## PART 7 — Troubleshooting

- **"Failed to connect after 3 attempts"** — confirm the TikTok username has no `@`/spaces, that
  the account is actually live right now, and that your Eulerstream key was pasted with no
  extra spaces.
- **Nothing happens when chat types a word** — make sure a puzzle is active (tap **New Puzzle**
  first); only words that are actually still on the board count.
- **The leaderboard reset after redeploying** — expected on Render's free tier; the save file
  resets when the server restarts, but scores persist normally throughout a broadcast.
- **The layout looks off after rotating my phone** — it recalculates automatically on the next
  resize event; a quick screen rotation back and forth fixes it if needed.
- **The server crashed** — it shouldn't: every handler and the TikTok connection are wrapped in
  error protection, and uncaught exceptions/unhandled rejections are caught server-wide so one
  bad comment can never take the whole game down.

You're all set — enjoy running Category Connect Live!
