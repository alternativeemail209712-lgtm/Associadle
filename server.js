// server.js
// Category Connect Live -- backend server.
// A live, audience-playable word-grouping game (find 4 words that share a
// hidden category) styled after popular "word association match" games,
// driven entirely by TikTok LIVE chat comments.
//
// ANSWER MECHANISM: every tile on the board has a chess-style coordinate
// (column letter A-D + row number, e.g. "B3"). To claim a category, ONE
// viewer must type all 4 correct coordinates in a SINGLE chat message
// (e.g. "A1 B2 C3 D4"). This keeps answering fast and unambiguous for a
// live chat, and rewards the one viewer who actually solved it.
//
// Handles: Express static hosting, Socket.io realtime bridge to the browser,
// the TikTok LIVE connection (with retries + bulletproof parsing), the game
// state machine (puzzles, scoring, hints), and a simple JSON leaderboard
// file so scores survive a normal server restart.

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
// Board is always 4 columns wide (A, B, C, D). Rows scale with puzzle size:
// a 4-category puzzle (16 words) -> rows 1-4. A 6-category puzzle (24 words)
// -> rows 1-6. Every tile's coordinate is fixed for the life of the puzzle,
// exactly like a chessboard square never moves.
const COLS = ["A", "B", "C", "D"];

// game.tiles: one entry per word in the active puzzle, in fixed row-major
// order (index 0 = A1, index 1 = B1, index 2 = C1, index 3 = D1, index 4 =
// A2, ...):
//   { word, coord, categoryIndex, status: 'unsolved' | 'solved' | 'revealed' }
// game.solved: recap list [{ name, color, contributor }] in the order solved.
const game = {
  puzzle: null,
  tiles: [],
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
  try { fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(scores, null, 2)); }
  catch (err) { console.error("[leaderboard] Failed to save:", err?.message); }
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
  return {
    puzzleTitle: game.puzzle ? game.puzzle.title : null,
    totalGroups: game.puzzle ? game.puzzle.categories.length : 0,
    totalRows: game.puzzle ? game.puzzle.categories.length : 0,
    cols: COLS,
    active: game.active,
    strictMode: game.strictMode,
    mistakes: game.mistakes,
    maxMistakes: game.maxMistakes,
    tiles: game.tiles.map(t => {
      const base = { coord: t.coord, word: t.word, status: t.status };
      if (t.status === "solved" || t.status === "revealed") {
        const cat = game.puzzle.categories[t.categoryIndex];
        base.categoryName = cat.name;
        base.categoryColor = cat.color;
      }
      return base;
    }),
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

  const rawTiles = [];
  puzzle.categories.forEach((cat, ci) => {
    cat.words.forEach(w => rawTiles.push({ word: w, categoryIndex: ci }));
  });
  const shuffled = shuffle(rawTiles);
  shuffled.forEach((t, i) => {
    const row = Math.floor(i / COLS.length) + 1;
    const col = COLS[i % COLS.length];
    t.coord = `${col}${row}`;
    t.status = "unsolved";
  });

  game.puzzle = puzzle;
  game.tiles = shuffled;
  game.solved = [];
  game.hintedCategoryIndexes = [];
  game.mistakes = 0;
  game.active = true;
  game.startedAt = Date.now();

  console.log(`[puzzle] Loaded "${puzzle.title}" (${puzzle.categories.length} groups, board ${COLS.length}x${puzzle.categories.length}). Answers (server-only):`,
    puzzle.categories.map((c, i) => `${c.name}=[${shuffled.filter(t => t.categoryIndex === i).map(t => `${t.coord}:${t.word}`).join(",")}]`).join(" | "));

  broadcastGame();
}

function revealHint() {
  if (!game.active || !game.puzzle) return;
  const unsolvedUnhinted = game.puzzle.categories
    .map((c, i) => i)
    .filter(i => !game.solved.some(s => s.name === game.puzzle.categories[i].name))
    .filter(i => !game.hintedCategoryIndexes.includes(i));
  if (unsolvedUnhinted.length === 0) return;
  if (unsolvedUnhinted.length <= 1 && game.solved.length < game.puzzle.categories.length - 1) return;
  game.hintedCategoryIndexes.push(unsolvedUnhinted[0]);
  broadcastGame();
}

function setStrictMode(enabled) {
  game.strictMode = !!enabled;
  broadcastGame();
}

function revealAllRemaining(reason) {
  game.tiles.forEach(t => { if (t.status === "unsolved") t.status = "revealed"; });
  game.active = false;
  broadcastGame();
}

// ---------------------------------------------------------------------------
// 5. CHAT MESSAGE PROCESSING PIPELINE
//    Shared by: real TikTok chat, the manual composer (used for testing,
//    offline solo play, or host seeding), and simulated test messages.
//
//    A valid attempt = a SINGLE message containing 4 distinct board
//    coordinates (e.g. "A1 B2 C3 D4", "a1,b2,c2,d4", even "A1B2C3D4"
//    all work). If all 4 belong to the same hidden category, that viewer
//    wins the whole category. Anything else (fewer than 4 coordinates
//    found, unrelated chat, emoji spam) is simply not a guess and is
//    ignored -- so ordinary chat chatter never disrupts the game.
// ---------------------------------------------------------------------------
function extractCoords(text) {
  const matches = text.match(/[A-Da-d]\d{1,2}/g) || [];
  const seen = new Set();
  const coords = [];
  for (const m of matches) {
    const c = m.toUpperCase();
    if (!seen.has(c)) { seen.add(c); coords.push(c); }
    if (coords.length === 4) break;
  }
  return coords.length === 4 ? coords : null;
}

function processChatMessage(username, rawText) {
  try {
    if (typeof rawText !== "string") return;
    const text = rawText.trim();
    if (!text) return;

    // Always log to on-screen diagnostics, matched or not.
    logRawEvent(username, text);

    if (!game.active || !game.puzzle) return;

    const coords = extractCoords(text);
    if (!coords) return; // not a complete 4-coordinate attempt, ignore silently

    const uname = username && username.trim() ? username.trim() : "anonymous";

    const tiles = coords.map(c => game.tiles.find(t => t.coord === c));
    if (tiles.some(t => !t)) {
      io.emit("guess:miss", { username: uname, reason: "invalid" });
      return;
    }
    if (tiles.some(t => t.status !== "unsolved")) {
      io.emit("guess:miss", { username: uname, reason: "used" });
      return;
    }

    const counts = {};
    tiles.forEach(t => { counts[t.categoryIndex] = (counts[t.categoryIndex] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));

    if (maxCount === 4) {
      const catIndex = tiles[0].categoryIndex;
      const cat = game.puzzle.categories[catIndex];
      tiles.forEach(t => { t.status = "solved"; });
      awardPoints(uname, 100);
      awardWin(uname);
      game.solved.push({ name: cat.name, color: cat.color, contributor: uname });

      broadcastLeaderboard();
      io.emit("category:solved", { name: cat.name, color: cat.color, contributor: uname, coords });

      if (game.solved.length === game.puzzle.categories.length) {
        game.active = false;
        io.emit("puzzle:complete", { title: game.puzzle.title });
      }
      broadcastGame();
    } else {
      if (maxCount === 3) {
        io.emit("guess:oneaway", { username: uname });
      } else {
        io.emit("guess:miss", { username: uname, reason: "wrong" });
      }
      if (game.strictMode) {
        game.mistakes += 1;
        if (game.mistakes >= game.maxMistakes) {
          revealAllRemaining("mistakes");
          io.emit("puzzle:failed", { title: game.puzzle.title });
        } else {
          broadcastGame();
        }
      }
      // In casual (non-strict) mode, a wrong 4-coordinate attempt costs
      // nothing -- it just doesn't count, so the game keeps flowing.
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
      console.log("[tiktok:RAW CHAT EVENT]", JSON.stringify(raw));
      const { username, text } = extractUserAndText(raw);
      processChatMessage(username, text);
    } catch (err) { console.error("[tiktok chat handler] Safely ignored an error:", err?.message); }
  });

  if (chatEventName !== "chat") {
    connection.on("chat", (raw) => {
      try {
        console.log("[tiktok:RAW CHAT EVENT - fallback listener]", JSON.stringify(raw));
        const { username, text } = extractUserAndText(raw);
        processChatMessage(username, text);
      } catch (err) { console.error("[tiktok chat fallback handler] Safely ignored an error:", err?.message); }
    });
  }

  connection.on("disconnected", () => {
    try { tiktok.status = "disconnected"; tiktok.message = "Disconnected from TikTok LIVE."; broadcastTikTokStatus(); }
    catch (err) { console.error("[tiktok disconnected handler] error:", err?.message); }
  });

  connection.on("streamEnd", () => {
    try { tiktok.status = "disconnected"; tiktok.message = "The live stream has ended."; broadcastTikTokStatus(); }
    catch (err) { console.error("[tiktok streamEnd handler] error:", err?.message); }
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

  socket.on("host:connectTikTok", ({ username, signApiKey } = {}) => {
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

  socket.on("host:toggleStrictMode", ({ enabled } = {}) => {
    try { setStrictMode(enabled); } catch (err) { console.error("[host:toggleStrictMode] error:", err?.message); }
  });

  socket.on("host:endPuzzle", () => {
    try { revealAllRemaining("host"); } catch (err) { console.error("[host:endPuzzle] error:", err?.message); }
  });

  // Used by: the manual composer (testing, offline solo play, host seeding)
  // and simulated test messages. All go through the exact same pipeline a
  // real TikTok comment would use.
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
