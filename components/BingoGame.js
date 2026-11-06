"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FREE_INDEX, MAX_NUMBER, SIZE, getCompletedLines } from "@/lib/bingo";

const SESSION_KEY = "bingo-session";
const POLL_MS = 1500;

async function api(path, method = "GET", body) {
  const res = await fetch(`/api/rooms${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "เกิดข้อผิดพลาด"), { status: res.status });
  return data;
}

const marksKey = (s) => `bingo-marks-${s.code}-${s.playerId}`;
const loadMarks = (s) => {
  try {
    return JSON.parse(localStorage.getItem(marksKey(s))) || { round: 0, idx: [] };
  } catch {
    return { round: 0, idx: [] };
  }
};

export default function BingoGame() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [marksState, setMarksState] = useState({ round: 0, idx: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) setJoinCode(room.toUpperCase());
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (saved?.code && saved?.playerId) {
        setSession(saved);
        setMarksState(loadMarks(saved));
      }
    } catch {}
  }, []);

  const leave = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setState(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const poll = async () => {
      try {
        const s = await api(`/${session.code}?playerId=${session.playerId}`);
        if (active) setState(s);
      } catch (e) {
        if (active && e.status === 404) {
          leave();
          setError("ห้องนี้หมดอายุหรือไม่พบแล้ว");
        }
      }
    };
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [session, leave]);

  const enter = (code, playerId) => {
    const s = { code, playerId };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setMarksState({ round: 0, idx: [] });
    setState(null);
    setSession(s);
  };

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const createRoom = (e) => {
    e.preventDefault();
    run(async () => {
      const { code, playerId } = await api("", "POST", { name });
      enter(code, playerId);
    });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    run(async () => {
      const { code, playerId } = await api(`/${joinCode.trim()}/join`, "POST", { name });
      enter(code, playerId);
    });
  };

  const action = (type) =>
    run(async () => setState(await api(`/${session.code}/${type}`, "POST", { playerId: session.playerId })));

  const called = useMemo(() => new Set(state?.called ?? []), [state?.called]);

  const marked = useMemo(() => {
    const s = new Set([FREE_INDEX]);
    if (marksState.round === state?.round) marksState.idx.forEach((i) => s.add(i));
    return s;
  }, [marksState, state?.round]);

  const completed = useMemo(() => getCompletedLines(marked), [marked]);
  const winCells = useMemo(() => new Set(completed.flat()), [completed]);

  const toggle = (i) => {
    const n = state.board[i];
    if (n === null || !called.has(n)) return;
    const idx = marked.has(i) ? [...marked].filter((x) => x !== i && x !== FREE_INDEX) : [...marked, i].filter((x) => x !== FREE_INDEX);
    const next = { round: state.round, idx };
    setMarksState(next);
    localStorage.setItem(marksKey(session), JSON.stringify(next));
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/?room=${state.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!session) {
    const canSubmit = name.trim() && !busy;
    return (
      <div className="card">
        <h1>🎱 Bingo {SIZE}x{SIZE}</h1>
        <p className="sub">เล่นพร้อมกันหลายคน ทุกคนได้กระดานคนละแบบ</p>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อผู้เล่น"
          maxLength={20}
          autoFocus
        />
        <form onSubmit={joinRoom} className="join-row">
          <input
            className="input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="รหัสห้อง"
            maxLength={5}
          />
          <button className="btn primary" type="submit" disabled={!canSubmit || joinCode.trim().length < 5}>
            เข้าร่วมห้อง
          </button>
        </form>
        <div className="divider">หรือ</div>
        <form onSubmit={createRoom}>
          <button className="btn" type="submit" disabled={!canSubmit}>
            สร้างห้องใหม่ (เป็นโฮสต์)
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="card">
        <p className="sub">กำลังโหลด...</p>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  const me = state.players.find((p) => p.isMe);
  const iWon = !!me?.bingoAt;

  return (
    <div className="card wide">
      <h1>🎱 Bingo {SIZE}x{SIZE}</h1>
      <p className="sub">
        ห้อง <strong className="room-code">{state.code}</strong> · ผู้เล่น: <strong>{me?.name}</strong>
        {state.isHost && " (โฮสต์)"} · รอบที่ {state.round}
      </p>
      <button className="btn small" onClick={copyLink}>{copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์ชวนเพื่อน"}</button>

      {state.winners.length > 0 && (
        <div className="banner">
          🎉 BINGO! {state.winners.map((w, i) => `${i + 1}. ${w}`).join("  ")}
        </div>
      )}

      <div className="board" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {state.board.map((n, i) => {
          const isCalled = n !== null && called.has(n);
          return (
            <button
              key={i}
              className={`cell${i === FREE_INDEX ? " free" : ""}${marked.has(i) ? " marked" : ""}${winCells.has(i) ? " win" : ""}${isCalled && !marked.has(i) ? " hint" : ""}`}
              onClick={() => toggle(i)}
            >
              {i === FREE_INDEX ? "FREE" : n}
            </button>
          );
        })}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button className="btn bingo" onClick={() => action("bingo")} disabled={busy || iWon || !completed.length}>
          {iWon ? "บิงโกแล้ว ✓" : "BINGO!"}
        </button>
        {state.isHost && (
          <>
            <button className="btn primary" onClick={() => action("draw")} disabled={busy || state.called.length >= MAX_NUMBER}>
              สุ่มตัวเลข
            </button>
            <button className="btn" onClick={() => action("reset")} disabled={busy}>เริ่มรอบใหม่</button>
          </>
        )}
        <button className="btn" onClick={leave}>ออกจากห้อง</button>
      </div>

      <div className="called">
        <div className="sub">
          เลขที่ออกแล้ว ({state.called.length}/{MAX_NUMBER})
          {state.called.length > 0 && <> · ล่าสุด: <strong className="last">{state.called[state.called.length - 1]}</strong></>}
        </div>
        {!state.isHost && state.called.length === 0 && <div className="sub">รอโฮสต์สุ่มเลข...</div>}
        <div className="chips">
          {state.called.map((n) => (
            <span key={n} className="chip">{n}</span>
          ))}
        </div>
      </div>

      <div className="called">
        <div className="sub">ผู้เล่นในห้อง ({state.players.length})</div>
        <div className="chips">
          {state.players.map((p, i) => (
            <span key={i} className={`chip${p.isMe ? " me" : ""}`}>
              {p.isHost && "👑 "}{p.name}{p.bingoAt && " 🏆"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
