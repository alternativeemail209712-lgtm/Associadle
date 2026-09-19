// server.js
// Associadle Live -- backend server.
// Handles: Express static hosting, Socket.io realtime bridge to the browser,
// the TikTok LIVE connection (with retries + bulletproof parsing), the game
// state machine (rounds, grid board, hints, scoring), and a simple JSON
// leaderboard file so scores survive a normal server restart.

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";
import { getRandomWordForLength, getAvailableLengths } from "./words.js";

// ---------------------------------------------------------------------------
// 0. CRASH PREVENTION -- these two handlers are the safety net that stops a
//    single bad TikTok event, a bad chat message, or any other surprise from
//    ever taking the whole server down mid-broadcast.
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
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// 1. GAME STATE
// ---------------------------------------------------------------------------
const COLS = ["A", "B", "C", "D", "E", "F", "G", "H"]; // 8 columns
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8]; // 8 rows -> 64 total guess boxes

function makeEmptyBoard() {
  const board = {};
  for (const c of COLS) {
    for (const r of ROWS) {
      board[`${c}${r}`] = { guess: "", username: "", correct: false };
    }
  }
  return board;
}

const state = {
  board: makeEmptyBoard(),
  round: {
    active: false,
    length: 6,
    word: null, // full object {word, hints}
    hintsRevealed: 0,
    startedAt: null,
    winner: null
  },
  scores: {}, // { username: { score, wins } }
  diagnostics: {
    rawEventCount: 0,
    lastUser: "",
    lastText: ""
  },
  tiktok: {
    status: "disconnected", // disconnected | connecting | connected | error | retrying
    message: "Not connected",
    username: null
  }
};

let tiktokConnection = null;

// ---------------------------------------------------------------------------
// 2. LEADERBOARD PERSISTENCE (simple JSON file -- survives normal restarts;
//    note: on some free hosting tiers the disk resets on redeploy, that's OK,
//    the game still works perfectly, scores just start fresh after a deploy)
// ---------------------------------------------------------------------------
const LEADERBOARD_PATH = path.join(__dirname, "leaderboard.json");

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_PATH)) {
      const raw = fs.readFileSync(LEADERBOARD_PATH, "utf-8");
      state.scores = JSON.parse(raw);
      console.log("[leaderboard] Loaded existing leaderboard from disk.");
    }
  } catch (err) {
    console.error("[leaderboard] Failed to load leaderboard file, starting fresh:", err?.message);
    state.scores = {};
  }
}

function saveLeaderboard() {
  try {
    fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(state.scores, null, 2));
  } catch (err) {
    console.error("[leaderboard] Failed to save leaderboard file:", err?.message);
  }
}

loadLeaderboard();

function getTopLeaderboard() {
  return Object.entries(state.scores)
    .map(([username, data]) => ({ username, score: data.score || 0, wins: data.wins || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function awardPoints(username, points) {
  if (!username) username = "unknown";
  if (!state.scores[username]) state.scores[username] = { score: 0, wins: 0 };
  state.scores[username].score += points;
  state.scores[username].wins += 1;
  saveLeaderboard();
}

// ---------------------------------------------------------------------------
// 3. BROADCAST HELPERS -- every socket event the frontend listens for
// ---------------------------------------------------------------------------
function broadcastFullState() {
  io.emit("state:full", {
    board: state.board,
    round: publicRoundInfo(),
    diagnostics: state.diagnostics,
    tiktok: state.tiktok,
    leaderboard: getTopLeaderboard(),
    availableLengths: getAvailableLengths()
  });
}

function publicRoundInfo() {
  // Never leak the answer to the frontend while the round is active!
  const r = state.round;
  return {
    active: r.active,
    length: r.length,
    blanks: r.word ? r.word.word.length : r.length,
    hintsRevealed: r.hintsRevealed,
    hints: r.word ? r.word.hints.slice(0, r.hintsRevealed) : [],
    winner: r.winner,
    answer: r.active ? null : (r.word ? r.word.word : null)
  };
}

function broadcastBoard() {
  io.emit("board:update", state.board);
}

function broadcastRound() {
  io.emit("round:update", publicRoundInfo());
}

function broadcastLeaderboard() {
  io.emit("leaderboard:update", getTopLeaderboard());
}

function broadcastDiagnostics() {
  io.emit("diagnostics:update", state.diagnostics);
}

function broadcastTikTokStatus() {
  io.emit("tiktok:status", state.tiktok);
}

function logRawEvent(username, text) {
  state.diagnostics.rawEventCount += 1;
  state.diagnostics.lastUser = username || "unknown";
  state.diagnostics.lastText = text || "";
  broadcastDiagnostics();
}

// ---------------------------------------------------------------------------
// 4. ROUND CONTROL
// ---------------------------------------------------------------------------
function startNewRound(length) {
  const availableLengths = getAvailableLengths();
  let useLength = Number(length);
  if (!availableLengths.includes(useLength)) {
    // fall back to the closest length that actually has words
    useLength = availableLengths.reduce((closest, l) =>
      Math.abs(l - useLength) < Math.abs(closest - useLength) ? l : closest
    , availableLengths[0]);
  }
  const wordObj = getRandomWordForLength(useLength);
  if (!wordObj) {
    console.error(`[round] No words available for length ${useLength}`);
    return;
  }
  state.board = makeEmptyBoard();
  state.round = {
    active: true,
    length: useLength,
    word: wordObj,
    hintsRevealed: 1, // reveal the first hint immediately so it's never a totally blind guess
    startedAt: Date.now(),
    winner: null
  };
  console.log(`[round] New round started. Length=${useLength} Answer=${wordObj.word} (host/server only)`);
  broadcastBoard();
  broadcastRound();
}

function revealNextHint() {
  const r = state.round;
  if (!r.active || !r.word) return;
  if (r.hintsRevealed < r.word.hints.length) {
    r.hintsRevealed += 1;
    broadcastRound();
  }
}

function endRound(withWinner) {
  const r = state.round;
  if (!r.word) return;
  r.active = false;
  r.winner = withWinner || null;
  broadcastRound();
  broadcastBoard();
}

function resetBoard() {
  state.board = makeEmptyBoard();
  broadcastBoard();
}

// ---------------------------------------------------------------------------
// 5. CHAT MESSAGE PROCESSING PIPELINE
//    Shared by: real TikTok chat, Test Mode simulated chat, Offline Mode
//    host input, and the always-available manual "type as chat" box.
//    Recognizes: "A2 apple"  |  "a2: apple"  |  "A2 - apple"
//    Also accepts a bare full-word guess with no coordinate as a fallback,
//    auto-placing it into the next open box, so the game never feels unfair
//    to viewers who forget the coordinate format.
// ---------------------------------------------------------------------------
const COORD_REGEX = /^\s*([A-Ha-h])\s*([1-8])\s*[:\-]?\s+(.+?)\s*$/;

function findNextOpenCell() {
  for (const c of COLS) {
    for (const r of ROWS) {
      const key = `${c}${r}`;
      if (!state.board[key].guess) return key;
    }
  }
  return null;
}

function processChatMessage(username, rawText) {
  try {
    if (typeof rawText !== "string") return;
    const text = rawText.trim();
    if (!text) return;

    // Always log to on-screen diagnostics, matched or not.
    logRawEvent(username, text);

    const r = state.round;
    if (!r.active || !r.word) return; // no round running, nothing to score

    let cellKey = null;
    let guessText = null;

    const match = text.match(COORD_REGEX);
    if (match) {
      const col = match[1].toUpperCase();
      const row = match[2];
      cellKey = `${col}${row}`;
      guessText = match[3];
    } else {
      // Fallback: no coordinate given. If it looks like a genuine guess at
      // the whole word (length roughly matches), auto-assign an open cell.
      const stripped = text.replace(/[^A-Za-z]/g, "");
      if (stripped.length >= 2 && stripped.length <= 20) {
        const openCell = findNextOpenCell();
        if (openCell) {
          cellKey = openCell;
          guessText = text;
        }
      }
    }

    if (!cellKey || !state.board[cellKey]) return;

    const cell = state.board[cellKey];
    // Don't allow overwriting another viewer's existing guess in that box,
    // and never touch a box that's already been solved correctly.
    if (cell.correct) return;
    if (cell.guess && cell.username && cell.username.toLowerCase() !== (username || "").toLowerCase()) {
      return;
    }

    cell.guess = guessText.slice(0, 40); // keep board tidy
    cell.username = username || "anonymous";
    cell.correct = false;

    const isCorrect = guessText.trim().toLowerCase() === r.word.word.toLowerCase();

    if (isCorrect) {
      cell.correct = true;
      const secondsElapsed = Math.floor((Date.now() - r.startedAt) / 1000);
      const points = Math.max(20, 100 - (r.hintsRevealed - 1) * 15 - Math.floor(secondsElapsed / 10) * 2);
      awardPoints(cell.username, points);
      broadcastLeaderboard();
      endRound({ username: cell.username, points, word: r.word.word });
    } else {
      broadcastBoard();
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
  // library has used across versions, so one library update never silently
  // breaks the whole game.
  let username =
    raw?.user?.uniqueId ||
    raw?.user?.nickname ||
    raw?.uniqueId ||
    raw?.nickname ||
    raw?.user?.userId ||
    raw?.userId ||
    "unknown";

  let text =
    raw?.comment ||
    raw?.text ||
    raw?.message ||
    raw?.content ||
    "";

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

  // Also listen to the plain string name as a belt-and-suspenders fallback
  // in case a given library version emits under the string instead of the
  // WebcastEvent constant (harmless no-op duplicate protection included).
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
      state.tiktok.status = "disconnected";
      state.tiktok.message = "Disconnected from TikTok LIVE.";
      broadcastTikTokStatus();
    } catch (err) {
      console.error("[tiktok disconnected handler] error:", err?.message);
    }
  });

  connection.on("streamEnd", () => {
    try {
      state.tiktok.status = "disconnected";
      state.tiktok.message = "The live stream has ended.";
      broadcastTikTokStatus();
    } catch (err) {
      console.error("[tiktok streamEnd handler] error:", err?.message);
    }
  });

  connection.on("error", (err) => {
    console.error("[tiktok connection error event]", err?.message || err);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectToTikTok(username, signApiKey) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      state.tiktok.status = "connecting";
      state.tiktok.message = `Connecting to @${username} (attempt ${attempt}/${maxRetries})...`;
      state.tiktok.username = username;
      broadcastTikTokStatus();

      tiktokConnection = new TikTokLiveConnection(username, { signApiKey });
      registerTikTokHandlers(tiktokConnection);

      const roomState = await tiktokConnection.connect();

      state.tiktok.status = "connected";
      state.tiktok.message = `Connected! Room ID: ${roomState?.roomId || "unknown"}`;
      broadcastTikTokStatus();
      return;
    } catch (err) {
      console.error(`[tiktok] Connect attempt ${attempt} failed:`, err?.message || err);
      if (attempt >= maxRetries) {
        state.tiktok.status = "error";
        state.tiktok.message = `Failed to connect after ${maxRetries} attempts: ${err?.message || "Unknown error"}. Double check the username (no @) and your signing API key.`;
        broadcastTikTokStatus();
        return;
      }
      const backoffMs = attempt * 2000;
      state.tiktok.status = "retrying";
      state.tiktok.message = `Attempt ${attempt} failed, retrying in ${backoffMs / 1000}s...`;
      broadcastTikTokStatus();
      await sleep(backoffMs);
    }
  }
}

function disconnectTikTok() {
  try {
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
    }
    state.tiktok.status = "disconnected";
    state.tiktok.message = "Disconnected by host.";
    broadcastTikTokStatus();
  } catch (err) {
    console.error("[disconnectTikTok] error:", err?.message);
  }
}

// ---------------------------------------------------------------------------
// 7. SOCKET.IO -- bridge between the browser UI and all of the above
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("[socket] Client connected:", socket.id);

  // Send the new client the full current state immediately.
  socket.emit("state:full", {
    board: state.board,
    round: publicRoundInfo(),
    diagnostics: state.diagnostics,
    tiktok: state.tiktok,
    leaderboard: getTopLeaderboard(),
    availableLengths: getAvailableLengths()
  });

  socket.on("host:connectTikTok", ({ username, signApiKey }) => {
    try {
      if (!username || !signApiKey) {
        state.tiktok.status = "error";
        state.tiktok.message = "Both a TikTok username and a signing API key are required.";
        broadcastTikTokStatus();
        return;
      }
      connectToTikTok(String(username).trim().replace(/^@/, ""), String(signApiKey).trim());
    } catch (err) {
      console.error("[host:connectTikTok] error:", err?.message);
    }
  });

  socket.on("host:disconnectTikTok", () => {
    disconnectTikTok();
  });

  socket.on("host:startRound", ({ length }) => {
    try {
      startNewRound(length);
    } catch (err) {
      console.error("[host:startRound] error:", err?.message);
    }
  });

  socket.on("host:revealHint", () => {
    try {
      revealNextHint();
    } catch (err) {
      console.error("[host:revealHint] error:", err?.message);
    }
  });

  socket.on("host:endRound", () => {
    try {
      endRound(null);
    } catch (err) {
      console.error("[host:endRound] error:", err?.message);
    }
  });

  socket.on("host:resetBoard", () => {
    try {
      resetBoard();
    } catch (err) {
      console.error("[host:resetBoard] error:", err?.message);
    }
  });

  // Used by: Test Mode simulated chat, Offline Mode manual guesses, and the
  // always-on host "manual comment" box. All go through the exact same
  // pipeline a real TikTok comment would use.
  socket.on("chat:inject", ({ username, text }) => {
    try {
      processChatMessage(username && username.trim() ? username.trim() : "Host", text);
    } catch (err) {
      console.error("[chat:inject] error:", err?.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("[socket] Client disconnected:", socket.id);
  });
});

// ---------------------------------------------------------------------------
// 8. START SERVER
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Associadle Live server running on port ${PORT}`);
});
