import { randomUUID } from "crypto";
import { store } from "./store";
import { MAX_NUMBER, generateBoard, getCompletedLines } from "./bingo";

const TTL = 60 * 60 * 6;
const MAX_PLAYERS = 50;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const metaKey = (code) => `bingo:${code}:meta`;
const playersKey = (code) => `bingo:${code}:players`;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const genCode = () =>
  Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

function cleanName(name) {
  const n = String(name || "").trim().slice(0, 20);
  if (!n) throw new HttpError(400, "กรุณาใส่ชื่อ");
  return n;
}

async function getMeta(code) {
  const meta = await store.get(metaKey(String(code).toUpperCase()));
  if (!meta) throw new HttpError(404, "ไม่พบห้องนี้");
  return meta;
}

async function getPlayer(code, playerId) {
  const p = playerId ? await store.hget(playersKey(code), playerId) : null;
  if (!p) throw new HttpError(404, "ไม่พบผู้เล่นในห้องนี้");
  return p;
}

async function requireHost(code, playerId) {
  const meta = await getMeta(code);
  if (meta.hostId !== playerId) throw new HttpError(403, "เฉพาะโฮสต์เท่านั้น");
  return meta;
}

const newPlayer = (name) => ({ name, board: generateBoard(), joinedAt: Date.now(), bingoAt: null });

export async function createRoom(name) {
  const hostName = cleanName(name);
  let code;
  for (let i = 0; i < 10; i++) {
    const c = genCode();
    if (!(await store.get(metaKey(c)))) {
      code = c;
      break;
    }
  }
  if (!code) throw new HttpError(500, "สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง");
  const playerId = randomUUID();
  await store.set(metaKey(code), { code, hostId: playerId, called: [], round: 1 }, TTL);
  await store.hset(playersKey(code), playerId, newPlayer(hostName), TTL);
  return { code, playerId };
}

export async function joinRoom(code, name) {
  const playerName = cleanName(name);
  const meta = await getMeta(code);
  const players = await store.hgetall(playersKey(meta.code));
  if (Object.keys(players).length >= MAX_PLAYERS) throw new HttpError(400, "ห้องเต็มแล้ว");
  const playerId = randomUUID();
  await store.hset(playersKey(meta.code), playerId, newPlayer(playerName), TTL);
  return { code: meta.code, playerId };
}

export async function getState(code, playerId) {
  const meta = await getMeta(code);
  const players = await store.hgetall(playersKey(meta.code));
  const me = players[playerId];
  if (!me) throw new HttpError(404, "ไม่พบผู้เล่นในห้องนี้");
  const list = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => a.joinedAt - b.joinedAt);
  return {
    code: meta.code,
    round: meta.round,
    called: meta.called,
    isHost: meta.hostId === playerId,
    board: me.board,
    players: list.map((p) => ({
      name: p.name,
      isHost: p.id === meta.hostId,
      isMe: p.id === playerId,
      bingoAt: p.bingoAt,
    })),
    winners: list.filter((p) => p.bingoAt).sort((a, b) => a.bingoAt - b.bingoAt).map((p) => p.name),
  };
}

export async function draw(code, playerId) {
  const meta = await requireHost(code, playerId);
  const remaining = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1).filter((n) => !meta.called.includes(n));
  if (!remaining.length) throw new HttpError(400, "เลขออกครบแล้ว");
  meta.called.push(remaining[Math.floor(Math.random() * remaining.length)]);
  await store.set(metaKey(meta.code), meta, TTL);
  return getState(meta.code, playerId);
}

export async function claimBingo(code, playerId) {
  const meta = await getMeta(code);
  const player = await getPlayer(meta.code, playerId);
  if (!player.bingoAt) {
    const called = new Set(meta.called);
    const marked = new Set();
    player.board.forEach((n, i) => (n === null || called.has(n)) && marked.add(i));
    if (!getCompletedLines(marked).length) throw new HttpError(400, "ยังไม่บิงโก");
    player.bingoAt = Date.now();
    await store.hset(playersKey(meta.code), playerId, player, TTL);
  }
  return getState(meta.code, playerId);
}

export async function resetRoom(code, playerId) {
  const meta = await requireHost(code, playerId);
  meta.called = [];
  meta.round += 1;
  await store.set(metaKey(meta.code), meta, TTL);
  const players = await store.hgetall(playersKey(meta.code));
  await Promise.all(
    Object.entries(players).map(([id, p]) =>
      store.hset(playersKey(meta.code), id, { ...p, board: generateBoard(), bingoAt: null }, TTL)
    )
  );
  return getState(meta.code, playerId);
}
