# Associadle Live — Complete Setup Guide (No Coding Required)

This guide assumes you have never touched code before. Just follow every step in order.

---

## PART 1 — What you were given

You have a small folder called `associadle-live` containing these files:

```
associadle-live/
├── package.json          <- tells the server what software libraries it needs
├── server.js              <- the "brain" of the game (backend)
├── words.js                <- the list of secret words + clues (edit this anytime to add words)
├── .gitignore
├── DEPLOYMENT_GUIDE.md    <- this file
└── public/
    └── index.html          <- the screen you and your audience will see (frontend)
```

You will never need to open or understand the code inside these files. You only need to
upload them exactly as they are.

---

## PART 2 — Get a TikTok signing key (required for Live Mode)

TikTok requires a "signing key" for any tool that reads live chat. Anthropic did not create this
requirement — TikTok did — and there is no reliable way around it.

1. Go to **https://www.eulerstream.com**
2. Create a free account.
3. Once logged in, find your **API Key** on your dashboard (it will look like a long string of
   letters and numbers).
4. Copy it somewhere safe (like a Notes app). You will paste it into the game later.

You do **not** need this key for Test Mode or Offline Mode — only for connecting to a real TikTok LIVE.

---

## PART 3 — Put the project on GitHub (no commands needed)

GitHub is just a place to store your code so Render (the hosting service) can find it.

1. Go to **https://github.com** and create a free account if you don't have one.
2. Once logged in, click the **+** icon in the top-right corner → **New repository**.
3. Name it `associadle-live` (or anything you like). Leave everything else default. Click
   **Create repository**.
4. On the new repository page, click **uploading an existing file** (a blue link in the middle
   of the page).
5. Open the `associadle-live` folder on your computer. **Drag every file and the `public` folder**
   into the browser upload box. (If GitHub doesn't accept a folder drag on your browser, open the
   `public` folder first and upload `index.html` — GitHub will automatically recreate the
   `public/index.html` path for you as long as you drag the whole `public` folder.)
6. Scroll down, click the green **Commit changes** button.
7. Confirm all files now show up in your repository: `package.json`, `server.js`, `words.js`,
   `.gitignore`, `DEPLOYMENT_GUIDE.md`, and a `public` folder containing `index.html`.

---

## PART 4 — Deploy to Render.com

1. Go to **https://render.com** and create a free account (you can sign up directly with your
   GitHub account, which makes the next steps easier).
2. On your Render dashboard, click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository**, then connect your GitHub account if asked,
   and select the `associadle-live` repository you just created.
4. Fill in the settings:
   - **Name**: anything you like, e.g. `associadle-live`
   - **Region**: pick the one closest to you
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (fine for testing; consider a paid tier for a real broadcast so the
     server doesn't fall asleep from inactivity)
5. Click **Create Web Service**.
6. Wait 2–5 minutes. Render will show a build log. When you see `Associadle Live server running
   on port ...` in the log, it's live.
7. At the top of the Render page you'll see a URL like `https://associadle-live.onrender.com`.
   Open it — you should see the game screen.

**That's it — the game is now live on the internet and ready to broadcast from your phone.**

---

## PART 5 — Using the game

### Test Mode (try it out safely, no TikTok needed)
1. Open your Render URL.
2. Tap the **🧪 Test Mode** tab.
3. Scroll to **Host Controls**, choose a word length, tap **🆕 New Round**.
4. Tap **🎲 Simulate Random Fake Chat** a few times, or type your own fake username/message and
   tap **Send**, to watch the board fill in.
5. Tap **▶ Auto-Simulate** to have fake messages appear automatically every few seconds.

### Offline Mode (play solo)
1. Tap **🎮 Offline Mode**.
2. Start a round from Host Controls.
3. Type your own guesses (like `A2 apple`) into the Offline box and tap **Submit Guess**.

### Live Mode (real TikTok broadcast)
1. Tap **📡 Live Mode**.
2. Type your TikTok username with **no @ symbol** (e.g. `yourchannel`).
3. Paste your Eulerstream signing key from Part 2.
4. Tap **Connect to TikTok LIVE**. You should see the status box turn green/"Connected".
5. Start your TikTok LIVE broadcast from your phone as normal, screen-share or point a second
   camera at this game page, and start a round from Host Controls.
6. Tell your audience to type a box coordinate + their guess, like `A2 apple`, in your TikTok
   chat. Their guesses will appear live on the board.

### Host Controls (always available, any mode)
- **New Round**: picks a fresh secret word at the chosen length.
- **Reveal Hint**: shows the next clue word.
- **Reveal Answer**: ends the round early and shows the answer.
- **Clear Board**: wipes all current guesses without starting a new round.
- **Manual comment box**: lets you type anything as if it were a chat message — useful for
  testing, or for typing an answer yourself during a broadcast.

### On-screen diagnostics (bottom of the screen)
- **EVENTS**: increases every single time any message arrives, from any source. If this number
  never goes up while you're live, TikTok messages are not reaching the server — double-check
  your username and signing key.
- **LAST**: shows the very last username + message text the server received, so you can confirm
  in real time that real audience comments are getting through.
- **TIKTOK**: the current connection status word (`connected`, `connecting`, `retrying`, `error`,
  `disconnected`).

---

## PART 6 — Adding or changing words (optional, no coding needed)

1. On GitHub, open your repository and click on `words.js`.
2. Click the pencil (✏️) icon to edit.
3. Find the section for the length you want (e.g. `8: [ ... ]`).
4. Copy an existing line like:
   ```
   { word: "ELEPHANT", hints: ["Largest land animal", "Has a long trunk", "Big floppy ears", "Found in Africa or Asia", "Remembers things very well"] },
   ```
   and change the word (must be in CAPITAL LETTERS and match the length exactly) and the hints.
5. Scroll down, click **Commit changes**. Render will automatically redeploy your update within
   a minute or two.

---

## PART 7 — Troubleshooting

- **"Failed to connect after 3 attempts"** — Double-check the TikTok username has no `@`, no
  spaces, and that you are actually live (or the target account is live) at that moment. Also
  confirm your Eulerstream key was copied correctly with no extra spaces.
- **Nothing happens when I type a guess** — Make sure you've tapped **New Round** first; guesses
  only count while a round is active. Also make sure the coordinate is a letter A–H followed by
  a number 1–8, then a space, then your guess (e.g. `C4 tiger`).
- **The leaderboard reset after I redeployed** — this is expected on Render's free tier, since the
  small save file resets when the server restarts. Scores persist normally during a single
  broadcast/session.
- **The page looks broken on my phone** — pull down to refresh the page once after your phone
  rotates or the browser bar shows/hides; the layout recalculates automatically on resize.
- **The server crashed** — it shouldn't: every message handler and the TikTok connection itself
  is wrapped in error protection, and the two most severe crash types (uncaught exceptions and
  unhandled promise rejections) are caught server-wide so one bad comment can never take the
  whole game down. If you ever see truly unexpected behavior, tap **Clear Board** and **New
  Round** to reset cleanly.

You're all set — enjoy running Associadle Live!
