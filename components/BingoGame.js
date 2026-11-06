"use client";

import { useEffect, useMemo, useState } from "react";
import { MAX_NUMBER, SIZE, generateBoard, getCompletedLines } from "@/lib/bingo";

const STORAGE_KEY = "bingo-player";

export default function BingoGame() {
  const [ready, setReady] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.name && saved.board?.length === SIZE * SIZE) setPlayer(saved);
    } catch {}
    setReady(true);
  }, []);

  const save = (p) => {
    setPlayer(p);
    if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const marked = useMemo(() => new Set(player?.marked ?? []), [player]);
  const completed = useMemo(() => getCompletedLines(marked), [marked]);
  const winCells = useMemo(() => new Set(completed.flat()), [completed]);

  const start = (e) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (name) save({ name, board: generateBoard(), marked: [] });
  };

  const toggle = (i) => {
    const next = player.marked.includes(i) ? player.marked.filter((x) => x !== i) : [...player.marked, i];
    save({ ...player, marked: next });
  };

  const clearMarks = () => save({ ...player, marked: [] });

  const newBoard = () => {
    if (window.confirm("สุ่มกระดานใหม่? เครื่องหมายที่ติ๊กไว้จะหายทั้งหมด")) {
      save({ ...player, board: generateBoard(), marked: [] });
    }
  };

  const leave = () => {
    if (window.confirm("เปลี่ยนผู้เล่น? กระดานปัจจุบันจะหายไป")) {
      save(null);
      setNameInput("");
    }
  };

  if (!ready) return null;

  if (!player) {
    return (
      <form className="card" onSubmit={start}>
        <h1>🎱 Bingo {SIZE}x{SIZE}</h1>
        <p className="sub">ใส่ชื่อของคุณเพื่อรับกระดานบิงโก (เลข 1–{MAX_NUMBER})</p>
        <input
          className="input"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="ชื่อผู้เล่น"
          maxLength={20}
          autoFocus
        />
        <button className="btn primary" type="submit" disabled={!nameInput.trim()}>
          รับกระดาน
        </button>
      </form>
    );
  }

  return (
    <div className="card wide">
      <h1>🎱 Bingo {SIZE}x{SIZE}</h1>
      <p className="sub">
        ผู้เล่น: <strong>{player.name}</strong> · บิงโก {completed.length} แถว
      </p>

      {completed.length > 0 && <div className="banner">🎉 BINGO! {player.name} บิงโกแล้ว!</div>}

      <div className="board" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {player.board.map((n, i) => (
          <button
            key={i}
            className={`cell${marked.has(i) ? " marked" : ""}${winCells.has(i) ? " win" : ""}`}
            onClick={() => toggle(i)}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="sub">เมื่อเลขที่ถูกสุ่มตรงกับกระดานของคุณ ให้กดที่ช่องนั้นเพื่อติ๊ก</p>

      <div className="actions">
        <button className="btn" onClick={clearMarks}>ล้างเครื่องหมาย</button>
        <button className="btn" onClick={newBoard}>สุ่มกระดานใหม่</button>
        <button className="btn" onClick={leave}>เปลี่ยนผู้เล่น</button>
      </div>
    </div>
  );
}
