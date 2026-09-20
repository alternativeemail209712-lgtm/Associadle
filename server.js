// server.js
// Category Connect Live -- backend server.
// A live, audience-playable word-grouping game (find 4 words that share a
// hidden category) styled after popular "word association match" games,
// driven entirely by TikTok LIVE chat comments.
//
// Handles: Express static hosting, Socket.io realtime bridge to the browser,
// the TikTok LIVE connection (with retries + bulletproof parsing), the game
// state machine (puzzles, staging, scoring, hints), and a simple JSON
// leaderboard file so scores survive a normal server restart.

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";
import { getAllPuzzleSummaries, getPuzzleById, getRandomPuzzle } from "./words.js";

// ---------------------------------------------------------------------------
// 0. CRASH PREVENTION -- stops a single bad TikTok event, a bad chat message,
//    or any other surprise from ever taking the whole server down mid-stream.
// ---------------------------------------------------------------------------
process.on("uncaughtException", (err) => {
  console.error("[FATAL-CAUGHT] Uncaught exception (server kept running):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL-CAUGHT] Unhandled promise rejection (server kept running):", reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// 1. GAME STATE
// ---------------------------------------------------------------------------
// game.tiles: one entry per word in the active puzzle:
//   { word, categoryIndex, status: 'unsolved' | 'staged' | 'solved' }
// game.staging: { categoryIndex: number|null, words: [{word, username}] }
// game.solved: [{ name, color, words: [word,...], contributors: [username,...] }]
// game.hintedCategoryIndexes: categories whose NAME has been revealed as a hint
//   before being solved (but the words are not revealed).
const game = {
  puzzle: null,        // full puzzle object currently loaded (server-only, has answers)
  tiles: [],
  staging: { categoryIndex: null, words: [] },
  solved: [],
  hintedCategoryIndexes: [],
  strictMode: false,
  mistakes: 0,
  maxMistakes: 4,
  active: false,
  startedAt: null
};

const diagnostics = { rawEventCount: 0, lastUser: "", lastText: "" };

const tiktok = { status: "disconnected", message: "Not connected", username: null };

let scores = {}; // { username: { score, wins } }
let tiktokConnection = null;

// ---------------------------------------------------------------------------
// 2. LEADERBOARD PERSISTENCE
// ---------------------------------------------------------------------------
const LEADERBOARD_PATH = path.join(__dirname, "leaderboard.json");

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_PATH)) {
      scores = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, "utf-8"));
      console.log("[leaderboard] Loaded existing leaderboard from disk.");
    }
  } catch (err) {
    console.error("[leaderboard] Failed to load, starting fresh:", err?.message);
    scores = {};
  }
}
function saveLeaderboard() {
  try {
    fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(scores, null, 2));
  } catch (err) {
    console.error("[leaderboard] Failed to save:", err?.message);
  }
}
loadLeaderboard();

function getTopLeaderboard() {
  return Object.entries(scores)
    .map(([username, d]) => ({ username, score: d.score || 0, wins: d.wins || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
function awardPoints(username, points) {
  if (!username) username = "unknown";
  if (!scores[username]) scores[username] = { score: 0, wins: 0 };
  scores[username].score += points;
  saveLeaderboard();
}
function awardWin(username) {
  if (!scores[username]) scores[username] = { score: 0, wins: 0 };
  scores[username].wins += 1;
  saveLeaderboard();
}

// ---------------------------------------------------------------------------
// 3. BROADCAST HELPERS
// ---------------------------------------------------------------------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function publicGameView() {
  // Never leak categoryIndex of unsolved/staged tiles -- that's the answer!
  return {
    puzzleTitle: game.puzzle ? game.puzzle.title : null,
    totalGroups: game.puzzle ? game.puzzle.categories.length : 0,
    active: game.active,
    strictMode: game.strictMode,
    mistakes: game.mistakes,
    maxMistakes: game.maxMistakes,
    tiles: game.tiles
      .filter(t => t.status !== "solved")
      .map(t => ({ word: t.word, staged: t.status === "staged" })),
    staging: game.staging.words.map(w => ({ word: w.word, username: w.username })),
    solved: game.solved,
    hints: game.hintedCategoryIndexes.map(i => game.puzzle.categories[i].name)
  };
}

function broadcastGame() { io.emit("game:update", publicGameView()); }
function broadcastLeaderboard() { io.emit("leaderboard:update", getTopLeaderboard()); }
function broadcastDiagnostics() { io.emit("diagnostics:update", diagnostics); }
function broadcastTikTokStatus() { io.emit("tiktok:status", tiktok); }

function logRawEvent(username, text) {
  diagnostics.rawEventCount += 1;
  diagnostics.lastUser = username || "unknown";
  diagnostics.lastText = text || "";
  broadcastDiagnostics();
}

function fullStatePayload() {
  return {
    game: publicGameView(),
    leaderboard: getTopLeaderboard(),
    diagnostics,
    tiktok,
    puzzleList: getAllPuzzleSummaries()
  };
}

// ---------------------------------------------------------------------------
// 4. PUZZLE / ROUND CONTROL
// ---------------------------------------------------------------------------
function loadPuzzle(puzzleId) {
  let puzzle;
  if (puzzleId === "random" || puzzleId === undefined || puzzleId === null) {
    puzzle = getRandomPuzzle(game.puzzle ? game.puzzle.id : null);
  } else {
    puzzle = getPuzzleById(puzzleId) || getRandomPuzzle();
  }

  const tiles = [];
  puzzle.categories.forEach((cat, ci) => {
    cat.words.forEach(w => {
      tiles.push({ word: w, categoryIndex: ci, status: "unsolved" });
    });
  });

  game.puzzle = puzzle;
  game.tiles = shuffle(tiles);
  game.staging = { categoryIndex: null, words: [] };
  game.solved = [];
  game.hintedCategoryIndexes = [];
  game.mistakes = 0;
  game.active = true;
  game.startedAt = Date.now();

  console.log(`[puzzle] Loaded "${puzzle.title}" (${puzzle.categories.length} groups). Answers (server-only):`,
    puzzle.categories.map(c => `${c.name}=[${c.words.join(",")}]`).join(" | "));

  broadcastGame();
}

function clearSelection() {
  game.staging.words.forEach(w => {
    const tile = game.tiles.find(t => t.word === w.word && t.status === "staged");
    if (tile) tile.status = "unsolved";
  });
  game.staging = { categoryIndex: null, words: [] };
  broadcastGame();
}

function revealHint() {
  if (!game.active || !game.puzzle) return;
  const unsolvedUnhinted = game.puzzle.categories
    .map((c, i) => i)
    .filter(i => !game.solved.some(s => s.name === game.puzzle.categories[i].name))
    .filter(i => !game.hintedCategoryIndexes.includes(i));
  if (unsolvedUnhinted.length === 0) return;
  // Keep at least one category a full mystery if more than one remains unhinted.
  if (unsolvedUnhinted.length <= 1 && game.solved.length < game.puzzle.categories.length - 1) return;
  game.hintedCategoryIndexes.push(unsolvedUnhinted[0]);
  broadcastGame();
}

function setStrictMode(enabled) {
  game.strictMode = !!enabled;
  broadcastGame();
}

function endPuzzleRevealAll() {
  game.active = false;
  broadcastGame();
}

// ---------------------------------------------------------------------------
// 5. CHAT MESSAGE PROCESSING PIPELINE
//    Shared by: real TikTok chat, Test Mode simulated chat, Offline Mode
//    host input, and the always-available manual "type as chat" box.
//    Viewers simply type ONE WORD they see on the board. If it fits the
//    group currently being built, it's added. Four matching words = solved!
// ---------------------------------------------------------------------------
function normalizeGuess(raw) {
  return String(raw || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
}

function processChatMessage(username, rawText) {
  try {
    if (typeof rawText !== "string") return;
    const text = rawText.trim();
    if (!text) return;

    // Always log to on-screen diagnostics, matched or not.
    logRawEvent(username, text);

    if (!game.active || !game.puzzle) return;

    const word = normalizeGuess(text);
    if (!word) return;

    const tile = game.tiles.find(t => t.word === word);
    if (!tile || tile.status !== "unsolved") return; // not on board, or already used

    const uname = username && username.trim() ? username.trim() : "anonymous";

    if (game.staging.words.length === 0) {
      // Start a brand new candidate group.
      tile.status = "staged";
      game.staging = { categoryIndex: tile.categoryIndex, words: [{ word, username: uname }] };
      io.emit("guess:hit", { username: uname, word });
      broadcastGame();
      return;
    }

    if (tile.categoryIndex === game.staging.categoryIndex) {
      tile.status = "staged";
      game.staging.words.push({ word, username: uname });
      io.emit("guess:hit", { username: uname, word });

      if (game.staging.words.length === 4) {
        const cat = game.puzzle.categories[game.staging.categoryIndex];
        const contributors = [...new Set(game.staging.words.map(w => w.username))];
        game.staging.words.forEach(w => {
          const t = game.tiles.find(t2 => t2.word === w.word);
          if (t) t.status = "solved";
          awardPoints(w.username, 20);
        });
        awardPoints(uname, 30); // bonus to whoever completed the group
        awardWin(uname);
        game.solved.push({ name: cat.name, color: cat.color, words: game.staging.words.map(w => w.word), contributors });
        game.staging = { categoryIndex: null, words: [] };

        broadcastLeaderboard();
        io.emit("category:solved", { name: cat.name, color: cat.color, words: game.solved[game.solved.length - 1].words, contributors });

        if (game.solved.length === game.puzzle.categories.length) {
          game.active = false;
          io.emit("puzzle:complete", { title: game.puzzle.title });
        }
      }
      broadcastGame();
    } else {
      // Doesn't fit the group currently being built.
      io.emit("guess:miss", { username: uname, word });
      if (game.strictMode) {
        game.mistakes += 1;
        clearSelection(); // also broadcasts
        if (game.mistakes >= game.maxMistakes) {
          endPuzzleRevealAll();
          io.emit("puzzle:failed", { title: game.puzzle.title });
        } else {
          broadcastGame();
        }
      }
      // In casual (non-strict) mode, mismatched guesses are simply ignored
      // so one off-topic chat message never disrupts group progress.
    }
  } catch (err) {
    // A single malformed comment must NEVER crash the game.
    console.error("[processChatMessage] Error handling a chat message safely ignored:", err?.message);
  }
}

// ---------------------------------------------------------------------------
// 6. TIKTOK LIVE CONNECTION -- robust parsing + auto-retry
// ---------------------------------------------------------------------------
function extractUserAndText(raw) {
  // Fallback chain across every plausible field name/shape the connector
  // library has used across versions, so a library update never silently
  // breaks the whole game.
  const username =
    raw?.user?.uniqueId || raw?.user?.nickname || raw?.uniqueId ||
    raw?.nickname || raw?.user?.userId || raw?.userId || "unknown";
  const text = raw?.comment || raw?.text || raw?.message || raw?.content || "";
  return { username: String(username), text: String(text) };
}

function registerTikTokHandlers(connection) {
  const chatEventName = WebcastEvent && WebcastEvent.CHAT ? WebcastEvent.CHAT : "chat";

  connection.on(chatEventName, (raw) => {
    try {
      // Requirement: log the FULL raw shape of every incoming message so it
      // can be inspected/debugged even though the host has no server console.
      console.log("[tiktok:RAW CHAT EVENT]", JSON.stringify(raw));
      const { username, text } = extractUserAndText(raw);
      processChatMessage(username, text);
    } catch (err) {
      console.error("[tiktok chat handler] Safely ignored an error:", err?.message);
    }
  });

  if (chatEventName !== "chat") {
    connection.on("chat", (raw) => {
      try {
        console.log("[tiktok:RAW CHAT EVENT - fallback listener]", JSON.stringify(raw));
        const { username, text } = extractUserAndText(raw);
        processChatMessage(username, text);
      } catch (err) {
        console.error("[tiktok chat fallback handler] Safely ignored an error:", err?.message);
      }
    });
  }

  connection.on("disconnected", () => {
    try {
      tiktok.status = "disconnected";
      tiktok.message = "Disconnected from TikTok LIVE.";
      broadcastTikTokStatus();
    } catch (err) { console.error("[tiktok disconnected handler] error:", err?.message); }
  });

  connection.on("streamEnd", () => {
    try {
      tiktok.status = "disconnected";
      tiktok.message = "The live stream has ended.";
      broadcastTikTokStatus();
    } catch (err) { console.error("[tiktok streamEnd handler] error:", err?.message); }
  });

  connection.on("error", (err) => {
    console.error("[tiktok connection error event]", err?.message || err);
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function connectToTikTok(username, signApiKey) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      tiktok.status = "connecting";
      tiktok.message = `Connecting to @${username} (attempt ${attempt}/${maxRetries})...`;
      tiktok.username = username;
      broadcastTikTokStatus();

      tiktokConnection = new TikTokLiveConnection(username, { signApiKey });
      registerTikTokHandlers(tiktokConnection);

      const roomState = await tiktokConnection.connect();

      tiktok.status = "connected";
      tiktok.message = `Connected! Room ID: ${roomState?.roomId || "unknown"}`;
      broadcastTikTokStatus();
      return;
    } catch (err) {
      console.error(`[tiktok] Connect attempt ${attempt} failed:`, err?.message || err);
      if (attempt >= maxRetries) {
        tiktok.status = "error";
        tiktok.message = `Failed to connect after ${maxRetries} attempts: ${err?.message || "Unknown error"}. Double check the username (no @) and your signing API key.`;
        broadcastTikTokStatus();
        return;
      }
      const backoffMs = attempt * 2000;
      tiktok.status = "retrying";
      tiktok.message = `Attempt ${attempt} failed, retrying in ${backoffMs / 1000}s...`;
      broadcastTikTokStatus();
      await sleep(backoffMs);
    }
  }
}

function disconnectTikTok() {
  try {
    if (tiktokConnection) { tiktokConnection.disconnect(); tiktokConnection = null; }
    tiktok.status = "disconnected";
    tiktok.message = "Disconnected by host.";
    broadcastTikTokStatus();
  } catch (err) { console.error("[disconnectTikTok] error:", err?.message); }
}

// ---------------------------------------------------------------------------
// 7. SOCKET.IO -- bridge between the browser UI and all of the above
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("[socket] Client connected:", socket.id);
  socket.emit("state:full", fullStatePayload());

  socket.on("host:connectTikTok", ({ username, signApiKey }) => {
    try {
      if (!username || !signApiKey) {
        tiktok.status = "error";
        tiktok.message = "Both a TikTok username and a signing API key are required.";
        broadcastTikTokStatus();
        return;
      }
      connectToTikTok(String(username).trim().replace(/^@/, ""), String(signApiKey).trim());
    } catch (err) { console.error("[host:connectTikTok] error:", err?.message); }
  });

  socket.on("host:disconnectTikTok", () => disconnectTikTok());

  socket.on("host:newPuzzle", ({ puzzleId } = {}) => {
    try { loadPuzzle(puzzleId); } catch (err) { console.error("[host:newPuzzle] error:", err?.message); }
  });

  socket.on("host:revealHint", () => {
    try { revealHint(); } catch (err) { console.error("[host:revealHint] error:", err?.message); }
  });

  socket.on("host:clearSelection", () => {
    try { clearSelection(); } catch (err) { console.error("[host:clearSelection] error:", err?.message); }
  });

  socket.on("host:toggleStrictMode", ({ enabled } = {}) => {
    try { setStrictMode(enabled); } catch (err) { console.error("[host:toggleStrictMode] error:", err?.message); }
  });

  socket.on("host:endPuzzle", () => {
    try { endPuzzleRevealAll(); } catch (err) { console.error("[host:endPuzzle] error:", err?.message); }
  });

  // Used by: Test Mode simulated chat, Offline Mode manual guesses, and the
  // always-on host "manual comment" box. All go through the exact same
  // pipeline a real TikTok comment would use.
  socket.on("chat:inject", ({ username, text } = {}) => {
    try { processChatMessage(username && username.trim() ? username.trim() : "Host", text); }
    catch (err) { console.error("[chat:inject] error:", err?.message); }
  });

  socket.on("disconnect", () => console.log("[socket] Client disconnected:", socket.id));
});

// ---------------------------------------------------------------------------
// 8. START SERVER (loads a first puzzle automatically so the board is never
//    empty when the host opens the page for the first time)
// ---------------------------------------------------------------------------
loadPuzzle("random");

server.listen(PORT, () => {
  console.log(`Category Connect Live server running on port ${PORT}`);
});
